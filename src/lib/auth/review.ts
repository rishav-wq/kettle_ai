import "server-only";
import { env } from "@/lib/env";
import { indianPhone } from "@/lib/security/validators";
import { isAdminPhone } from "@/lib/admin";

/*
  The account a payment provider's reviewer signs in with.

  Razorpay will not approve a website without testing the purchase flow, and
  their form asks for a username and a password. Kettle has neither: sign-in is
  a six digit code sent to a phone, and a reviewer cannot receive an SMS sent
  to Rishav's handset. App stores have the same problem and the same answer —
  one nominated account whose code does not change.

  What this deliberately does NOT do is add a branch to verification. The
  review phone goes through the whole ordinary path: a challenge row is
  written, it expires on the usual schedule, the attempt cap applies, both rate
  limits apply, and the code is compared in constant time against the same
  hash. Exactly two things differ — the code is fixed rather than random, and
  no SMS is sent, because the number may not receive one and each send costs
  money.

  It is ordinary in every other way: a free viewer, no membership, and
  explicitly never an admin. See the guard below.

  Unset means the account does not exist, which is correct everywhere except
  the one deployment being reviewed. REVIEW_UNTIL makes forgetting it survivable
  rather than permanent: past that date it stops working on its own.
*/

function normalise(raw: string | undefined): string | null {
  if (!raw || raw.trim() === "") return null;
  const parsed = indianPhone.safeParse(raw.trim());
  if (!parsed.success) {
    console.error(`[review] REVIEW_PHONE is not a readable Indian mobile and was ignored: ${JSON.stringify(raw)}`);
    return null;
  }
  return parsed.data;
}

const PHONE = normalise(env.REVIEW_PHONE);
const CODE = (env.REVIEW_CODE ?? "").trim();
const UNTIL = env.REVIEW_UNTIL ? new Date(`${env.REVIEW_UNTIL}T23:59:59+05:30`) : null;

const misconfigured =
  PHONE !== null && (!/^\d{6}$/.test(CODE) || (env.REVIEW_UNTIL != null && Number.isNaN(UNTIL?.getTime())));

if (process.env.NODE_ENV !== "test") {
  if (misconfigured) {
    console.error("[review] REVIEW_PHONE is set but REVIEW_CODE must be six digits and REVIEW_UNTIL a date like 2026-10-31. The review account is off.");
  } else if (PHONE && UNTIL && UNTIL.getTime() < Date.now()) {
    console.warn(`[review] the review account for ${PHONE} expired on ${env.REVIEW_UNTIL}. It no longer signs in. Remove the variables.`);
  } else if (PHONE) {
    /*
      Loud on purpose. This is a fixed credential on a live site; it should be
      impossible to forget it is there while reading a deploy log.
    */
    console.warn(
      `[review] a review account is ACTIVE for ${PHONE}${env.REVIEW_UNTIL ? ` until ${env.REVIEW_UNTIL}` : " with no expiry date set"}. ` +
        `Anyone who knows the number and the code can sign in as it. Remove REVIEW_PHONE, REVIEW_CODE and REVIEW_UNTIL once the review is done.`
    );
    if (isAdminPhone(PHONE)) {
      console.error("[review] REFUSING: the review phone is also in ADMIN_PHONES. A fixed code must never reach the catalogue editor.");
    }
  }
}

/**
 * The fixed code for this phone, or null if it is not the review account.
 *
 * Returns null the moment anything is off — unset, malformed, expired, or
 * pointing at an admin — so every caller fails closed without repeating the
 * conditions.
 */
export function reviewCodeFor(phone: string): string | null {
  if (!PHONE || misconfigured) return null;
  if (phone !== PHONE) return null;
  if (UNTIL && UNTIL.getTime() < Date.now()) return null;
  // An admin must never be reachable with a code that does not change.
  if (isAdminPhone(PHONE)) return null;
  return CODE;
}

/** The number the sign-in screen must route past the SMS widget. Null when off. */
export function reviewPhone(): string | null {
  return reviewCodeFor(PHONE ?? "") === null ? null : PHONE;
}
