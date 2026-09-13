import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";

/*
  Fixed-window rate limiter backed by Postgres.

  No Redis at this scale. One upsert per check, atomic, works identically on
  Neon and on the local PGlite database. Keys are "scope:subject", for example
  "otp-send:+919821340917" or "otp-send-ip:203.0.113.4".
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

  // Insert the window, or bump the count if the row is already in this window,
  // or reset it if the stored window is older. One statement, no race.
  const rows = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.windowStart} = ${windowStart} THEN ${rateLimits.count} + 1 ELSE 1 END`,
        windowStart,
      },
    })
    .returning({ count: rateLimits.count });

  const count = rows[0]?.count ?? 1;
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
