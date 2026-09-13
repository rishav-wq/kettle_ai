import "server-only";
import { randomUUID } from "node:crypto";
import type { MembershipDoc, ReferralCodeDoc, UserDoc } from "@/lib/db/documents";
import type { Scoped } from "@/lib/db/scope";
import { audit } from "@/lib/audit";

/*
  Referral codes.

  Only gold members get one, so a code in circulation always belongs to someone
  who paid. Entry at sign in is open to everyone, and the attribution is stored
  on the user from the moment they sign up, whether or not they ever pay.

  The alphabet leaves out characters that look alike when read aloud over the
  phone or typed by someone with a small screen: no O or 0, no I or 1, no S or 5.
*/

const ALPHABET = "ABCDEFGHJKLMNPQRTUVWXYZ2346789";
const LENGTH = 6;

/** What each side receives when a referred person pays. The interface promises "an extra month". */
export const REFERRAL_BONUS_MONTHS = 1;

function randomCode(): string {
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH));
  for (let i = 0; i < LENGTH; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}

/** Returns the member's code, creating one on first use. */
export async function getOrCreateReferralCode(db: Scoped, tenantId: string, userId: string): Promise<string> {
  const existing = await db.findOne<ReferralCodeDoc>("referral_codes", { userId });
  if (existing) return existing.code;

  // Collisions are vanishingly rare at this scale; the unique index on code is
  // what actually decides the race, so a duplicate key just means try again.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    try {
      await db.insertOne<ReferralCodeDoc>("referral_codes", { code, tenantId, userId, createdAt: new Date() });
      return code;
    } catch {
      // Duplicate code. Loop and draw another.
    }
  }
  throw new Error("could_not_allocate_referral_code");
}

/** The person behind a code, if it is real. Used to greet a referred visitor by name. */
export async function lookupReferrer(db: Scoped, code: string): Promise<{ userId: string } | null> {
  const row = await db.findOne<ReferralCodeDoc>("referral_codes", { code });
  return row ? { userId: row.userId } : null;
}

export type RewardResult =
  | { granted: false; reason: "no_code" | "already_rewarded" | "unknown_code" | "self_referral" }
  | { granted: true; referrerUserId: string };

/**
 * Pays out the referral bonus, once, when a referred person's membership activates.
 *
 * Both sides get REFERRAL_BONUS_MONTHS. The referred person's fresh membership
 * is extended. The referrer's active membership is extended too, or, if theirs
 * has lapsed since they shared the code, a new one-month membership is opened
 * so the promise still holds.
 *
 * Idempotency is the whole point, because the webhook that triggers this is
 * retried. In Postgres a transaction made the check-then-pay safe. There is no
 * transaction here, so the marker is *claimed* first with a conditional
 * update: only the caller whose update actually matched a document with a null
 * marker goes on to pay. Two simultaneous retries cannot both win that, which
 * makes this stricter than the read-then-check it replaces rather than weaker.
 */
export async function grantReferralReward(db: Scoped, tenantId: string, referredUserId: string): Promise<RewardResult> {
  const referred = await db.findOne<UserDoc>("users", { id: referredUserId });

  if (!referred?.referredByCode) return { granted: false, reason: "no_code" };
  if (referred.referralRewardedAt) return { granted: false, reason: "already_rewarded" };

  const referrer = await lookupReferrer(db, referred.referredByCode);
  if (!referrer) return { granted: false, reason: "unknown_code" };
  if (referrer.userId === referredUserId) return { granted: false, reason: "self_referral" };

  const now = new Date();

  // Claim the payout. Whoever flips the marker from null owns it; everyone
  // else is told it is already done and stops here, having changed nothing.
  const claimed = await db.updateOne<UserDoc>(
    "users",
    { id: referredUserId, referralRewardedAt: null },
    { $set: { referralRewardedAt: now } }
  );
  if (claimed === 0) return { granted: false, reason: "already_rewarded" };

  // $dateAdd rather than reading the date and writing it back, so "add a month
  // to whatever is there" stays one atomic operation, as make_interval was.
  const addMonth = [
    { $set: { validUntil: { $dateAdd: { startDate: "$validUntil", unit: "month", amount: REFERRAL_BONUS_MONTHS } } } },
  ];

  // The referred person: extend the membership that has just been activated.
  await db.updateMany<MembershipDoc>("memberships", { userId: referredUserId, status: "active" }, addMonth as never);

  // The referrer: extend if active, otherwise open a bonus membership.
  const active = await db.findOne<MembershipDoc>("memberships", {
    userId: referrer.userId,
    status: "active",
    validUntil: { $gt: now },
  });

  if (active) {
    await db.updateOne<MembershipDoc>("memberships", { id: active.id }, addMonth as never);
  } else {
    const until = new Date(now);
    until.setMonth(until.getMonth() + REFERRAL_BONUS_MONTHS);
    await db.insertOne<MembershipDoc>("memberships", {
      id: randomUUID(),
      tenantId,
      userId: referrer.userId,
      payerUserId: null,
      status: "active",
      validFrom: now,
      validUntil: until,
      createdAt: now,
    });
  }

  await audit(db, {
    tenantId,
    actorUserId: referredUserId,
    action: "referral.rewarded",
    targetType: "user",
    targetId: referrer.userId,
    meta: { code: referred.referredByCode, months: REFERRAL_BONUS_MONTHS },
  });

  return { granted: true, referrerUserId: referrer.userId };
}
