import "server-only";
import { env } from "@/lib/env";

/*
  Which Razorpay credentials this process uses.

  There are two sets and they must never be confused. Test keys take play
  money through a real integration; live keys take real money from real people.
  The difference between them is one character in a variable name, which is a
  thin thing to rest a bank account on.

  So the mode is derived from NODE_ENV rather than chosen, and the wrong set
  cannot be reached even deliberately:

    development, test  ->  RAZORPAY_TEST_*   and a live key is REFUSED
    production         ->  RAZORPAY_LIVE_*   and a test key is refused

  RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET still work as an override for a
  deployment that carries only one set — which is what render.yaml describes,
  and what every environment before this one used. They are checked first, and
  are subject to the same refusal.

  The refusal is the point. Twice already the live keys sat in .env.local,
  where the only thing between a smoke run and real orders on a real account
  was remembering. Now a live key in development stops the payment path
  entirely and says why.
*/

export type RazorpayMode = "test" | "live";

/*
  Production normally means live keys. RAZORPAY_TEST_MODE_UNTIL is the one way
  to say otherwise, and it is deliberately awkward: a date, not a flag.

  The reason it exists is that a webhook has to be delivered to a public URL,
  and the only public URL this product has is the deployed site. Walking the
  paid flow on the real domain, with the real webhook, before real money is
  switched on, otherwise needs a tunnel to a laptop — which tests a machine
  that is not the one customers will use.

  The reason it is a date is that the failure it invites is forgetting. A site
  left on test keys takes no money and looks like it is working, which is the
  quietest possible way to lose every sale. This turns itself off.
*/
function resolveMode(): RazorpayMode {
  if (env.NODE_ENV !== "production") return "test";

  const raw = env.RAZORPAY_TEST_MODE_UNTIL;
  if (!raw) return "live";

  // End of that day, India time, matching how REVIEW_UNTIL is read.
  const until = new Date(`${raw}T23:59:59+05:30`);
  if (Number.isNaN(until.getTime())) {
    console.error(
      `[razorpay] RAZORPAY_TEST_MODE_UNTIL is not a date like 2026-10-05: ${JSON.stringify(raw)}. Staying on LIVE keys.`
    );
    return "live";
  }
  if (until.getTime() < Date.now()) {
    console.warn(`[razorpay] test mode in production expired on ${raw}. Back on LIVE keys. Remove RAZORPAY_TEST_MODE_UNTIL.`);
    return "live";
  }

  /*
    Loud on purpose, same reason as the review account. While this is on, the
    deployed site cannot take a real payment from a real customer, and nothing
    on the page says so.
  */
  console.warn(
    `[razorpay] TEST MODE IN PRODUCTION until ${raw}. This site is taking play money and CANNOT be paid by a real customer. ` +
      `Remove RAZORPAY_TEST_MODE_UNTIL and set the live keys when the walk-through is done.`
  );
  return "test";
}

export const razorpayMode: RazorpayMode = resolveMode();

type Keys = { keyId: string; keySecret: string; webhookSecret: string | null };

function firstSet(...candidates: (string | undefined)[]): string | undefined {
  return candidates.find((v) => typeof v === "string" && v.trim() !== "");
}

/** Refuses a key from the wrong half of the account. Returns why, or null if it is fine. */
function wrongMode(keyId: string): string | null {
  if (razorpayMode === "test" && keyId.startsWith("rzp_live")) {
    return env.NODE_ENV === "production"
      ? "test mode is on in production but the key resolved to a LIVE one. Refusing: set RAZORPAY_TEST_KEY_ID, or remove RAZORPAY_TEST_MODE_UNTIL."
      : "a LIVE key is configured but NODE_ENV is not production. Refusing: this would take real money from a development machine.";
  }
  if (razorpayMode === "live" && keyId.startsWith("rzp_test")) {
    return "a test key is configured in production. Refusing: payments would appear to work and settle nothing.";
  }
  return null;
}

function resolve(): Keys | null {
  const keyId = firstSet(
    env.RAZORPAY_KEY_ID,
    razorpayMode === "live" ? env.RAZORPAY_LIVE_KEY_ID : env.RAZORPAY_TEST_KEY_ID
  );
  const keySecret = firstSet(
    env.RAZORPAY_KEY_SECRET,
    razorpayMode === "live" ? env.RAZORPAY_LIVE_KEY_SECRET : env.RAZORPAY_TEST_KEY_SECRET
  );

  if (!keyId || !keySecret) return null;

  const complaint = wrongMode(keyId);
  if (complaint) {
    console.error(`[razorpay] ${complaint} Payments are unavailable until this is corrected.`);
    return null;
  }

  return {
    keyId,
    keySecret,
    webhookSecret:
      firstSet(
        env.RAZORPAY_WEBHOOK_SECRET,
        razorpayMode === "live" ? env.RAZORPAY_LIVE_WEBHOOK_SECRET : env.RAZORPAY_TEST_WEBHOOK_SECRET
      ) ?? null,
  };
}

const keys = resolve();

/** True once a usable pair for this mode is present. Drives the paywall. */
export const razorpayConfigured = keys !== null;

/** The pair to sign API calls with. Throws rather than guess; callers check razorpayConfigured first. */
export function razorpayKeys(): { keyId: string; keySecret: string } {
  if (!keys) throw new Error("Razorpay keys are not configured.");
  return { keyId: keys.keyId, keySecret: keys.keySecret };
}

/*
  The key id alone, for handing to Razorpay's hosted checkout in the browser.

  A key id is public by design — it identifies the merchant in the checkout
  script and is visible in the page source of every Razorpay integration. Only
  the secret is a secret. This is separate from razorpayKeys() so that the one
  value that is safe to send to a client can be reached without also holding
  the one that is not.
*/
export function razorpayPublicKeyId(): string | null {
  return keys?.keyId ?? null;
}

/** The webhook secret for this mode, or null. The webhook route answers 503 without it. */
export function razorpayWebhookSecret(): string | null {
  return keys?.webhookSecret ?? null;
}

if (process.env.NODE_ENV !== "test") {
  if (!keys) {
    console.log(
      `[razorpay] no usable ${razorpayMode} keys, so payments are unavailable` +
        (razorpayMode === "test" ? " and /api/payments/simulate stands in for the webhook." : ".")
    );
  } else {
    /*
      The mode and the last four characters of the key id, never the secret.
      Enough to tell at a glance which half of the account a deploy is on,
      which is the question anyone reads this log to answer.
    */
    console.log(
      `[razorpay] ${razorpayMode} mode, key …${keys.keyId.slice(-4)}` +
        (keys.webhookSecret ? "" : " — but no webhook secret, so a payment will never grant Gold.")
    );
  }
}
