import "server-only";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/mongo";
import type { SmsDeliveryDoc } from "@/lib/db/documents";

/*
  The record of what we asked the provider to send, and what became of it.

  Sits outside withTenant() for the same reason sessions and OTP challenges do:
  a code is sent before anyone knows who the person is, so there is no tenant
  to scope to. It is written by the send route and updated by the provider's
  delivery-report webhook.

  Nothing here is ever consulted to decide whether someone may sign in. It
  exists so that "no code came" has an answer other than a shrug.
*/

/** How long a delivery record is worth keeping. It holds a phone number. */
const RETAIN_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Records that a message was handed to the provider.
 *
 * Deliberately swallows its own failures. A logging table must never be the
 * reason a person cannot sign in: the code has already been sent by the time
 * this runs, so a write error here is worth a log line and nothing more.
 */
export async function recordSend(params: {
  provider: string;
  providerMessageId: string | null;
  phone: string;
  purpose?: string;
}): Promise<void> {
  try {
    const db = await getDb();
    await db.collection<SmsDeliveryDoc>("sms_deliveries").insertOne({
      id: randomUUID(),
      provider: params.provider,
      providerMessageId: params.providerMessageId,
      phone: params.phone,
      purpose: params.purpose ?? "otp",
      status: "queued",
      providerStatus: null,
      sentAt: new Date(),
      reportedAt: null,
    });

    // No cron, so the sweep rides along with the writes, as it does for OTP
    // challenges. Bounded work: the table only holds thirty days of sends.
    await db.collection<SmsDeliveryDoc>("sms_deliveries").deleteMany({ sentAt: { $lt: new Date(Date.now() - RETAIN_MS) } });
  } catch (err) {
    console.error("[sms] could not record the send", err);
  }
}

export type DeliveryOutcome = "delivered" | "failed" | "unknown";

/**
 * Applies a provider's delivery report to the matching send.
 *
 * Matched on the message id alone, not on the id plus the provider name.
 *
 * The id is already the provider's own globally unique handle, and the
 * endpoint a report arrives at establishes which provider sent it, so adding
 * the name to the match buys nothing. What it does buy is a silent failure: a
 * send recorded under one name can never be reconciled by a webhook that
 * expects another, and "wrong provider name" looks exactly like "id we have
 * never seen". That is not hypothetical — it is what the local dev sender did,
 * recording "dev" against ids the MSG91 endpoint then failed to find.
 *
 * Returns whether a row was touched. The webhook reports success to the
 * provider either way, so an unknown id does not provoke endless retries.
 */
export async function applyDeliveryReport(params: {
  providerMessageId: string;
  outcome: DeliveryOutcome;
  providerStatus: string | null;
}): Promise<boolean> {
  const db = await getDb();
  const res = await db.collection<SmsDeliveryDoc>("sms_deliveries").updateOne(
    // providerMessageId is nullable — the dev sender used to leave it unset —
    // so match on the value rather than letting a null report match a null row.
    { providerMessageId: params.providerMessageId },
    { $set: { status: params.outcome, providerStatus: params.providerStatus, reportedAt: new Date() } }
  );

  return res.matchedCount > 0;
}
