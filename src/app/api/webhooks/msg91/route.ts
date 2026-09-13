import { timingSafeEqual } from "node:crypto";
import { applyDeliveryReport, type DeliveryOutcome } from "@/lib/auth/sms-delivery";
import { env } from "@/lib/env";

/*
  MSG91 delivery reports.

  Configure the callback in the MSG91 dashboard as:
      https://<your-domain>/api/webhooks/msg91?token=<MSG91_WEBHOOK_SECRET>

  Unlike Razorpay, MSG91 does not sign these callbacks, so there is no body to
  verify — the shared secret in the URL is the whole proof. That is genuinely
  weaker, so the blast radius is kept at zero: this endpoint writes one row in
  an observability table and can grant nothing, expire nothing, and unlock
  nothing. The worst a forged call achieves is a wrong line in the delivery log.

  It always answers 200 once authenticated, including for a report about a
  message we have no record of. A provider that gets an error back retries, and
  retrying will not make an unknown id known.
*/

/** Their vocabulary varies by route and changes without notice, so match loosely. */
function outcomeFrom(status: string): DeliveryOutcome {
  const s = status.toLowerCase();
  if (s.includes("deliver") || s === "dlvrd" || s === "1") return "delivered";
  if (s.includes("fail") || s.includes("reject") || s.includes("undeliv") || s.includes("expired") || s.includes("block")) return "failed";
  return "unknown";
}

/** Pulls the first string found at any of these keys, at the top level or one down. */
function pluck(payload: Record<string, unknown>, keys: string[]): string | null {
  const seen: Record<string, unknown>[] = [payload];
  for (const value of Object.values(payload)) {
    if (value && typeof value === "object" && !Array.isArray(value)) seen.push(value as Record<string, unknown>);
    if (Array.isArray(value) && value[0] && typeof value[0] === "object") seen.push(value[0] as Record<string, unknown>);
  }
  for (const source of seen) {
    for (const key of keys) {
      const found = source[key];
      if (typeof found === "string" && found !== "") return found;
      if (typeof found === "number") return String(found);
    }
  }
  return null;
}

function authorised(req: Request, secret: string): boolean {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  // Compare in constant time, but only when the lengths already match:
  // timingSafeEqual throws on a length mismatch.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const secret = env.MSG91_WEBHOOK_SECRET;
  if (!secret) {
    console.error("msg91 delivery report received but MSG91_WEBHOOK_SECRET is not set");
    return Response.json({ error: "not_configured" }, { status: 503 });
  }
  if (!authorised(req, secret)) {
    // Terse on purpose. A forged call learns nothing about why it failed.
    return Response.json({ error: "unauthorised" }, { status: 401 });
  }

  const raw = await req.text();
  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    payload = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  /*
    The exact field names are not something I could verify against a live
    account, so several plausible spellings are tried rather than one guessed
    confidently. When none match, the payload is logged in full — it contains a
    number and a status, never a code — so the first real report from your
    account tells us the shape and this list can be narrowed to it.
  */
  const messageId = pluck(payload, ["requestId", "request_id", "reqid", "requestID", "messageId", "message_id", "id"]);
  const status = pluck(payload, ["status", "description", "deliveryStatus", "delivery_status", "state"]);

  if (!messageId || !status) {
    console.error(`[sms] msg91 delivery report in an unrecognised shape: ${raw.slice(0, 500)}`);
    return Response.json({ ok: true, ignored: "unrecognised_shape" });
  }

  const outcome = outcomeFrom(status);
  const matched = await applyDeliveryReport({
    providerMessageId: messageId,
    outcome,
    providerStatus: status,
  });

  if (outcome === "failed") {
    // The one thing worth noticing without being asked: codes are not arriving.
    console.error(`[sms] msg91 reports delivery failed request=${messageId} status=${status}`);
  }

  return Response.json({ ok: true, matched });
}
