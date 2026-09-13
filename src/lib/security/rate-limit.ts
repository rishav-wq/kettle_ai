import { getDb } from "@/lib/db/mongo";
import type { RateLimitDoc } from "@/lib/db/documents";

/*
  Fixed-window rate limiter backed by MongoDB.

  No Redis at this scale. Keys are "scope:subject", for example
  "otp-send:+919821340917" or "otp-send-ip:203.0.113.4".

  The property worth preserving through the port is atomicity. The Postgres
  version was a single upsert with a CASE, so two simultaneous requests could
  not both read a count of four and both write five. Read-then-write here would
  reintroduce exactly that race, and a rate limiter that can be beaten by
  concurrency is not a rate limiter — it is the one place where losing this
  matters most, since the thing being limited is abuse.

  So the Mongo version is also one statement: findOneAndUpdate with an
  aggregation-pipeline update, which evaluates the conditional reset inside the
  same atomic document operation.
*/

export type Limit = { max: number; windowSec: number };

export const LIMITS = {
  /** OTP sends per phone. Stops OTP bombing of one number. */
  otpSendPhone: { max: 5, windowSec: 15 * 60 } satisfies Limit,
  /** OTP sends per IP. Stops one attacker spraying many numbers. */
  otpSendIp: { max: 20, windowSec: 15 * 60 } satisfies Limit,
  /*
    Every OTP send, everywhere, in a day.

    The per-phone and per-IP caps stop one attacker from one address. They do
    nothing about a botnet: a thousand addresses each staying politely under
    twenty is twenty thousand messages, which is real money leaving the account
    and twenty thousand strangers receiving a code they did not ask for, with
    Kettle's name on it.

    Deliberately far above honest traffic — a hundred signups a day is about a
    hundred and thirty sends — so it is a circuit breaker, not a throttle. If
    it ever trips, something is wrong and sign-in stopping is the better
    outcome.
  */
  otpSendGlobal: { max: 2000, windowSec: 24 * 60 * 60 } satisfies Limit,
  /** Verify attempts per phone. A six digit code with 5 tries is not brute-forceable. */
  otpVerifyPhone: { max: 5, windowSec: 15 * 60 } satisfies Limit,
  /*
    Widget token verification, per IP. Each attempt costs an outbound call to
    MSG91, and the phone is unknown until that call returns, so the caller is
    the only thing left to limit. Higher than the per-phone cap because one
    household or office can share an address.
  */
  widgetVerifyIp: { max: 30, windowSec: 15 * 60 } satisfies Limit,
  /** Payment order creation per user. */
  orderCreate: { max: 10, windowSec: 60 * 60 } satisfies Limit,
  /** Progress heartbeats per user. Generous, only stops abuse. */
  progressBeat: { max: 600, windowSec: 60 * 60 } satisfies Limit,
};

export type RateResult = { ok: boolean; remaining: number; retryAfterSec: number };

export async function checkRate(key: string, limit: Limit): Promise<RateResult> {
  const db = await getDb();
  const windowMs = limit.windowSec * 1000;
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);

  /*
    Insert the window, bump the count if the document is already in this
    window, or reset it to one if the stored window is older. A pipeline update
    so the comparison happens server-side inside the same atomic operation —
    the direct equivalent of the CASE in the SQL this replaces.
  */
  const updated = await db.collection<RateLimitDoc>("rate_limits").findOneAndUpdate(
    { key },
    [
      {
        $set: {
          key,
          windowStart,
          count: {
            $cond: [{ $eq: ["$windowStart", windowStart] }, { $add: [{ $ifNull: ["$count", 0] }, 1] }, 1],
          },
        },
      },
    ],
    { upsert: true, returnDocument: "after" }
  );

  const count = updated?.count ?? 1;
  const remaining = Math.max(0, limit.max - count);
  const retryAfterSec = Math.ceil((windowStart.getTime() + windowMs - now) / 1000);
  return { ok: count <= limit.max, remaining, retryAfterSec };
}

/** Throws a Response-shaped error the route handler can return directly. */
export async function enforceRate(key: string, limit: Limit): Promise<void> {
  const r = await checkRate(key, limit);
  if (!r.ok) {
    throw new RateLimited(r.retryAfterSec);
  }
}

export class RateLimited extends Error {
  constructor(public retryAfterSec: number) {
    super("Too many requests");
  }
  toResponse(): Response {
    return new Response(JSON.stringify({ error: "too_many_requests", retryAfterSec: this.retryAfterSec }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": String(this.retryAfterSec) },
    });
  }
}
