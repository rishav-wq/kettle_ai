import "server-only";
import { eq } from "drizzle-orm";
import { PUBLIC_TENANT, users } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { createSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import type { Lang } from "@/lib/viewer";

/*
  What happens once a phone number is proven.

  Shared by both ways of proving it: our own OTP challenge, and the MSG91
  widget's access token. Everything after the proof is identical and must stay
  identical — the account, the tenant, the audit row, the session cookie — so
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
  const { userId, isNew } = await withTenant(PUBLIC_TENANT, async (tx) => {
    const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.phone, input.phone)).limit(1);

    if (existing) {
      await tx
        .update(users)
        .set({ lastSeenAt: new Date(), lang: input.lang, whatsappOptIn: input.whatsappOptIn })
        .where(eq(users.id, existing.id));
      await audit(tx, {
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

    const [created] = await tx
      .insert(users)
      .values({
        tenantId: PUBLIC_TENANT,
        phone: input.phone,
        name: input.name,
        lang: input.lang,
        whatsappOptIn: input.whatsappOptIn,
        referredByCode: input.referredByCode,
        consentAt: new Date(),
        lastSeenAt: new Date(),
      })
      .returning({ id: users.id });

    await audit(tx, {
      tenantId: PUBLIC_TENANT,
      actorUserId: created!.id,
      action: "auth.signup",
      targetType: "user",
      targetId: created!.id,
      ip: input.ip,
      meta: { referred: Boolean(input.referredByCode), method: input.method },
    });
    return { userId: created!.id, isNew: true };
  });

  await createSession(userId, PUBLIC_TENANT);
  return { userId, isNew };
}
