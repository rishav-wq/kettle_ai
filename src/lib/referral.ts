import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { memberships, referralCodes, users } from "@/lib/db/schema";
import type { Tx } from "@/lib/db/tenant";
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
export async function getOrCreateReferralCode(tx: Tx, tenantId: string, userId: string): Promise<string> {
  const [existing] = await tx.select({ code: referralCodes.code }).from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
  if (existing) return existing.code;

  // Collisions are vanishingly rare at this scale; retry a few times rather than loop forever.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const inserted = await tx.insert(referralCodes).values({ code, tenantId, userId }).onConflictDoNothing().returning({ code: referralCodes.code });
    if (inserted.length > 0) return inserted[0]!.code;
  }
  throw new Error("could_not_allocate_referral_code");
}

/** The person behind a code, if it is real. Used to greet a referred visitor by name. */
export async function lookupReferrer(tx: Tx, code: string): Promise<{ userId: string } | null> {
  const [row] = await tx.select({ userId: referralCodes.userId }).from(referralCodes).where(eq(referralCodes.code, code)).limit(1);
  return row ?? null;
}

export type RewardResult = { granted: false; reason: "no_code" | "already_rewarded" | "unknown_code" | "self_referral" } | { granted: true; referrerUserId: string };

/**
 * Pays out the referral bonus, once, when a referred person's membership activates.
 *
 * Both sides get REFERRAL_BONUS_MONTHS. The referred person's fresh membership is
 * extended. The referrer's active membership is extended too, or, if theirs has
 * lapsed since they shared the code, a new one-month membership is opened so the
 * promise still holds. A marker on the referred user makes this idempotent, which
 * matters because the webhook that triggers it is retried.
 *
 * Called only from the webhook and its local stand-in, inside their transaction.
 */
export async function grantReferralReward(tx: Tx, tenantId: string, referredUserId: string): Promise<RewardResult> {
  const [referred] = await tx
    .select({ code: users.referredByCode, rewardedAt: users.referralRewardedAt })
    .from(users)
    .where(eq(users.id, referredUserId))
    .limit(1);

  if (!referred?.code) return { granted: false, reason: "no_code" };
  if (referred.rewardedAt) return { granted: false, reason: "already_rewarded" };

  const referrer = await lookupReferrer(tx, referred.code);
  if (!referrer) return { granted: false, reason: "unknown_code" };
  if (referrer.userId === referredUserId) return { granted: false, reason: "self_referral" };

  const bonus = sql`make_interval(months => ${REFERRAL_BONUS_MONTHS})`;
  const now = new Date();

  // The referred person: extend the membership that has just been activated.
  await tx
    .update(memberships)
    .set({ validUntil: sql`${memberships.validUntil} + ${bonus}` })
    .where(and(eq(memberships.userId, referredUserId), eq(memberships.status, "active")));

  // The referrer: extend if active, otherwise open a bonus membership.
  const [active] = await tx
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.userId, referrer.userId), eq(memberships.status, "active"), gt(memberships.validUntil, now)))
    .limit(1);

  if (active) {
    await tx.update(memberships).set({ validUntil: sql`${memberships.validUntil} + ${bonus}` }).where(eq(memberships.id, active.id));
  } else {
    const until = new Date(now);
    until.setMonth(until.getMonth() + REFERRAL_BONUS_MONTHS);
    await tx.insert(memberships).values({ tenantId, userId: referrer.userId, payerUserId: null, status: "active", validFrom: now, validUntil: until });
  }

  await tx.update(users).set({ referralRewardedAt: now }).where(eq(users.id, referredUserId));

  await audit(tx, { tenantId, actorUserId: referredUserId, action: "referral.rewarded", targetType: "user", targetId: referrer.userId, meta: { code: referred.code, months: REFERRAL_BONUS_MONTHS } });

  return { granted: true, referrerUserId: referrer.userId };
}
