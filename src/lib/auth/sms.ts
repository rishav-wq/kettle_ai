import "server-only";
import { randomUUID } from "node:crypto";
import { env, isProd } from "@/lib/env";
import type { Lang } from "@/lib/viewer";

/*
  Sending the code.

  One interface, two implementations, chosen by whether credentials exist.
  Swapping MSG91 for Firebase, Clerk, or anyone else is this file only.

  India-specific: transactional SMS needs DLT registration with the telecom
  regulator. The sender id and the template are registered with TRAI through
  the provider, and the message text must match the approved template exactly.
  A template is registered per language, so Hindi and English are two
  registrations, not one.

  We generate and hash the code ourselves rather than using MSG91's OTP
  endpoint, which would keep the code on their side. Ours means we control
  expiry, attempt limits and revocation, and a database dump still does not
  yield a usable code.
*/

export interface SmsSender {
  readonly name: string;
  /**
   * Resolves with the provider's id for the message, or null if it has none.
   *
   * That id is the only handle on the message afterwards: it is what a
   * delivery report arrives quoting, and what you search for in the provider's
   * dashboard when someone says no code came. It used to be logged and
   * discarded.
   */
  sendOtp(phone: string, code: string, lang: Lang): Promise<string | null>;
}

/**
 * A send that did not happen.
 *
 * Carries a reason for the log and nothing for the caller: the client is told
 * only that the code could not be sent, because the provider's message can
 * name the number and we do not want that on a screen.
 */
export class SmsError extends Error {
  constructor(public reason: string) {
    super(`sms_send_failed: ${reason}`);
  }
  toResponse(): Response {
    return Response.json({ error: "send_failed" }, { status: 502 });
  }
}

/** Prints the code to the server log. Used until credentials exist. */
const devSender: SmsSender = {
  name: "dev",
  async sendOtp(phone, code) {
    /*
      It invents a message id even though it sends nothing. That makes the
      whole delivery path — record the send, receive a report, match it —
      exercisable locally with no credentials and no real SMS, which is the
      only way to know the webhook works before DLT clears.
    */
    const requestId = `dev-${randomUUID().slice(0, 8)}`;
    console.log(
      `\n  ┌─────────────────────────────────────────┐\n  │  Kettle OTP for ${phone}\n  │  code: ${code}\n  │  request: ${requestId}\n  └─────────────────────────────────────────┘\n`
    );
    return requestId;
  },
};

/** Eight seconds. A person is staring at a spinner; a hung provider must not hold the request open. */
const TIMEOUT_MS = 8000;

function templateFor(lang: Lang): string | undefined {
  const perLanguage = lang === "hi" ? env.MSG91_TEMPLATE_ID_HI : env.MSG91_TEMPLATE_ID_EN;
  return perLanguage ?? env.MSG91_TEMPLATE_ID;
}

/**
 * MSG91 Flow API. Template and sender id must already be DLT-approved.
 *
 * What this call can and cannot tell us, measured against the live endpoint
 * rather than assumed. It answers HTTP 200 with `{"type":"error"}` for a
 * malformed request, so the status code alone is not enough and the body is
 * checked. But it answers `{"type":"success"}` for an invalid auth key and a
 * template id of all zeroes: the queue accepts first and validates later.
 * `realTimeResponse` does not change that.
 *
 * So a success here means accepted for delivery, not delivered. The returned
 * id is what makes the difference recoverable: it is stored against the send
 * and quoted back by the delivery report that arrives at
 * /api/webhooks/msg91 a few seconds later.
 */
function msg91Sender(authKey: string): SmsSender {
  return {
    name: "msg91",
    async sendOtp(phone, code, lang) {
      const templateId = templateFor(lang);
      if (!templateId) throw new SmsError(`no template configured for lang=${lang}`);

      let res: Response;
      try {
        res = await fetch("https://control.msg91.com/api/v5/flow/", {
          method: "POST",
          headers: { "content-type": "application/json", authkey: authKey },
          signal: AbortSignal.timeout(TIMEOUT_MS),
          body: JSON.stringify({
            template_id: templateId,
            short_url: "0",
            ...(env.MSG91_SENDER_ID ? { sender: env.MSG91_SENDER_ID } : {}),
            // The key must match the variable in the approved template, ##otp##.
            recipients: [{ mobiles: phone.replace(/^\+/, ""), otp: code }],
          }),
        });
      } catch (err) {
        // A timeout arrives here as an AbortError.
        throw new SmsError(err instanceof Error ? err.name : "network");
      }

      const text = await res.text();
      let body: { type?: string; message?: unknown } = {};
      try {
        body = JSON.parse(text) as typeof body;
      } catch {
        // Non-JSON is itself a failure signal unless the status was fine.
      }

      // The message can contain the recipient's number, so it goes to the log,
      // never to the caller. It never contains the code: we do not send it here.
      if (!res.ok || body.type === "error") {
        const detail = typeof body.message === "string" ? body.message : text.slice(0, 200);
        console.error(`[sms] msg91 refused (${res.status}) template=${templateId}: ${detail}`);
        throw new SmsError(`provider_${res.status}`);
      }

      // On success `message` is the request id. Safe to log and to store: it
      // identifies the message, not its contents, and never carries the code.
      const requestId = typeof body.message === "string" ? body.message : null;
      console.log(`[sms] msg91 queued template=${templateId} request=${requestId ?? "?"}`);
      return requestId;
    },
  };
}

/**
 * Chosen on first send, not on import.
 *
 * Resolving at import time would break `next build`, which evaluates every
 * route with NODE_ENV=production before secrets are necessarily in scope. This
 * still refuses to serve a real production request with no provider.
 */
export const sms: SmsSender = {
  get name() {
    return pick().name;
  },
  sendOtp(phone, code, lang) {
    return pick().sendOtp(phone, code, lang);
  },
};

export function pick(): SmsSender {
  if (env.MSG91_AUTH_KEY && (env.MSG91_TEMPLATE_ID || env.MSG91_TEMPLATE_ID_EN || env.MSG91_TEMPLATE_ID_HI)) {
    return msg91Sender(env.MSG91_AUTH_KEY);
  }
  if (isProd) {
    throw new Error("No SMS provider configured. Set MSG91_AUTH_KEY and at least one MSG91_TEMPLATE_ID.");
  }
  return devSender;
}

/**
 * True when codes are only printed locally, so the sign-in screen can say so.
 *
 * Derived from the sender actually chosen, not from whether a key exists. Those
 * two came apart the moment an auth key was added without a template: pick()
 * still returned the dev sender, but the screen stopped saying so, and a person
 * would have sat waiting for an SMS that was never going to be sent.
 *
 * A function rather than a constant because pick() throws in production when
 * nothing is configured, and a module-level throw breaks the build.
 */
export function smsIsDev(): boolean {
  try {
    return pick().name === "dev";
  } catch {
    return false;
  }
}
