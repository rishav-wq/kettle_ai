import "server-only";
import { reviewCodeFor } from "@/lib/auth/review";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db/mongo";
import type { OtpChallengeDoc } from "@/lib/db/documents";
import { getAuthSecret } from "@/lib/env";

/*
  Phone verification.

  The code is six digits, lives five minutes, allows five attempts, and is
  single use. Only an HMAC of it is stored, keyed by AUTH_SECRET, so someone
  holding a database dump still cannot recover the code offline.

  Rate limiting lives in the route handler, per phone and per IP, because the
  abuse we care about is OTP bombing a stranger's number as much as it is
  brute force.
*/

const TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/*
  Smallest gap between two sends to the same number.

  The sign-in screen already counts down thirty seconds before it re-enables
  the resend button, but that is a courtesy to the person, not a control: a
  script can call the endpoint in a loop. The per-phone rate limit caps the
  quarter hour at five; this caps the burst, so five sends cannot all arrive in
  the same second. Every SMS costs money and lands on someone's handset.
*/
const RESEND_GAP_MS = 30 * 1000;

function hashCode(phone: string, code: string): string {
  // The phone is part of the input so a code hash cannot be replayed against another number.
  return createHmac("sha256", getAuthSecret()).update(`${phone}:${code}`).digest("hex");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

async function challenges() {
  const db = await getDb();
  return db.collection<OtpChallengeDoc>("otp_challenges");
}

export type IssueResult =
  | { ok: true; code: string }
  | { ok: false; reason: "too_soon"; retryAfterSec: number };

/**
 * Creates or replaces the challenge for a phone and returns the code to send.
 *
 * Issuing replaces any code already outstanding for that number, so the most
 * recent message is always the one that works. Refuses inside the resend gap.
 */
export async function issueCode(phone: string, referredByCode?: string): Promise<IssueResult> {
  const col = await challenges();
  const now = Date.now();

  // Expired challenges are dead weight and there is no cron to sweep them, so
  // every send clears them. The collection only ever holds live challenges.
  await col.deleteMany({ expiresAt: { $lt: new Date(now) } });

  const current = await col.findOne({ phone }, { projection: { createdAt: 1 } });
  if (current) {
    const age = now - current.createdAt.getTime();
    if (age < RESEND_GAP_MS) {
      return { ok: false, reason: "too_soon", retryAfterSec: Math.ceil((RESEND_GAP_MS - age) / 1000) };
    }
  }

  /*
    The review account's code does not change. Everything else about the
    challenge is identical — same hash, same expiry, same attempt cap — so
    verification needs no special case and cannot be weakened by one.
  */
  const fixed = reviewCodeFor(phone);
  const code = fixed ?? String(randomInt(0, 1_000_000)).padStart(6, "0");
  const doc: OtpChallengeDoc = {
    phone,
    codeHash: hashCode(phone, code),
    expiresAt: new Date(now + TTL_MS),
    attempts: 0,
    referredByCode: referredByCode ?? null,
    createdAt: new Date(now),
  };

  // One live challenge per phone; the unique index on phone enforces it and
  // replaceOne makes issuing idempotent rather than additive.
  await col.replaceOne({ phone }, doc, { upsert: true });

  return { ok: true, code };
}

export type VerifyResult =
  | { ok: true; referredByCode: string | null }
  | { ok: false; reason: "no_challenge" | "expired" | "too_many_attempts" | "wrong_code" };

/** Checks a code and consumes the challenge on success. */
export async function verifyCode(phone: string, code: string): Promise<VerifyResult> {
  const col = await challenges();
  const row = await col.findOne({ phone });

  if (!row) return { ok: false, reason: "no_challenge" };

  if (row.expiresAt.getTime() < Date.now()) {
    await col.deleteOne({ phone });
    return { ok: false, reason: "expired" };
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    await col.deleteOne({ phone });
    return { ok: false, reason: "too_many_attempts" };
  }

  if (!constantTimeEqual(row.codeHash, hashCode(phone, code))) {
    // $inc rather than read-then-write: two simultaneous wrong guesses must
    // both count, or the attempt cap can be walked past with concurrency.
    await col.updateOne({ phone }, { $inc: { attempts: 1 } });
    return { ok: false, reason: "wrong_code" };
  }

  // Single use: the challenge is gone whether or not the caller finishes signing in.
  await col.deleteOne({ phone });
  return { ok: true, referredByCode: row.referredByCode };
}
