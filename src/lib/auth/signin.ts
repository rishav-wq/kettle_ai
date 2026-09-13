import "server-only";
import { randomUUID } from "node:crypto";
import { PUBLIC_TENANT, withTenant } from "@/lib/db/scope";
import type { Lang, UserDoc } from "@/lib/db/documents";
import { createSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

/*
  What happens once a phone number is proven.

  Shared by both ways of proving it: our own OTP challenge, and the MSG91
  widget's access token. Everything after the proof is identical and must stay
  identical — the account, the tenant, the audit entry, the session cookie — so
  it lives here rather than being written twice and drifting.

  This function never decides whether the proof was good. Its callers do that
  first, on the server, and only call in once they are certain.
*/

export type SignInInput = {
  /** Proven, not claimed. Never take this from a request body. */
  phone: string;
  name: string;
  lang: Lang;
  whatsappOptIn: boolean;
  referredByCode: string | null;
  ip: string;
  /** How the number was proven, for the audit trail. */
  method: "otp" | "widget";
};

export async function completeSignIn(input: SignInInput): Promise<{ userId: string; isNew: boolean }> {
  const { userId, isNew } = await withTenant(PUBLIC_TENANT, async (db) => {
    const existing = await db.findOne<UserDoc>("users", { phone: input.phone });

    if (existing) {
      await db.updateOne<UserDoc>(
        "users",
        { id: existing.id },
        { $set: { lastSeenAt: new Date(), lang: input.lang, whatsappOptIn: input.whatsappOptIn } }
      );
      await audit(db, {
        tenantId: PUBLIC_TENANT,
        actorUserId: existing.id,
        action: "auth.signin",
        targetType: "user",
        targetId: existing.id,
        ip: input.ip,
        meta: { method: input.method },
      });
      return { userId: existing.id, isNew: false };
    }

    const now = new Date();
    const id = randomUUID();

    /*
      The unique index on (tenantId, phone) is what actually prevents two
      accounts for one number — two simultaneous sign-ins can both miss the
      findOne above, and only one of them will survive the insert.
    */
    await db.insertOne<UserDoc>("users", {
      id,
      tenantId: PUBLIC_TENANT,
      phone: input.phone,
      name: input.name,
      lang: input.lang,
      preferredCategoryId: null,
      city: null,
      consentAt: now,
      onboardedAt: null,
      referredByCode: input.referredByCode,
      referralRewardedAt: null,
      whatsappOptIn: input.whatsappOptIn,
      createdAt: now,
      lastSeenAt: now,
    });

    await audit(db, {
      tenantId: PUBLIC_TENANT,
      actorUserId: id,
      action: "auth.signup",
      targetType: "user",
      targetId: id,
      ip: input.ip,
      meta: { referred: Boolean(input.referredByCode), method: input.method },
    });
    return { userId: id, isNew: true };
  });

  await createSession(userId, PUBLIC_TENANT);
  return { userId, isNew };
}
