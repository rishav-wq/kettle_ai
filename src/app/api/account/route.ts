import { z } from "zod";
import { eq } from "drizzle-orm";
import { assertSameOrigin, clientIp, toErrorResponse } from "@/lib/security/request";
import { displayName, lang as langSchema, parseBody } from "@/lib/security/validators";
import { withTenant } from "@/lib/db/tenant";
import { freeWatchLog, memberships, payments, progress, referralCodes, users } from "@/lib/db/schema";
import { destroyAllSessions, destroySession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { getViewer } from "@/lib/viewer";

const Patch = z.object({
  name: displayName.optional(),
  lang: langSchema.optional(),
  city: z.string().trim().max(60).nullable().optional(),
  whatsappOptIn: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  try {
    await assertSameOrigin(req);
    const viewer = await getViewer();
    if (!viewer.userId) return Response.json({ error: "not_signed_in" }, { status: 401 });

    const body = await parseBody(req, Patch);
    if (Object.keys(body).length === 0) return Response.json({ ok: true });

    await withTenant(viewer.tenantId, (tx) => tx.update(users).set(body).where(eq(users.id, viewer.userId!)));
    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * Deletes the account and everything attached to it.
 *
 * India's data protection law gives people a right to erasure, and it has to be
 * something they can do themselves rather than a support request. Payment rows
 * are the one thing kept: they are financial records, so the link to the person
 * is severed and an anonymous record of the transaction remains.
 *
 * Order matters, because the foreign keys point inward: unhook the payments,
 * then remove the memberships they referenced, then the rest, then the user.
 */
export async function DELETE(req: Request) {
  try {
    await assertSameOrigin(req);
    const viewer = await getViewer();
    if (!viewer.userId) return Response.json({ error: "not_signed_in" }, { status: 401 });

    const userId = viewer.userId;
    const ip = await clientIp();

    await withTenant(viewer.tenantId, async (tx) => {
      // Written first so the record of the deletion survives the deletion.
      await audit(tx, { tenantId: viewer.tenantId, actorUserId: userId, action: "account.deleted", targetType: "user", targetId: userId, ip });

      await tx.update(payments).set({ userId: null, membershipId: null }).where(eq(payments.userId, userId));
      await tx.delete(memberships).where(eq(memberships.userId, userId));
      await tx.delete(progress).where(eq(progress.userId, userId));
      await tx.delete(freeWatchLog).where(eq(freeWatchLog.userId, userId));
      await tx.delete(referralCodes).where(eq(referralCodes.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });

    // Sessions cascade on the user row, but clear the cookie too.
    await destroyAllSessions(userId);
    await destroySession();
    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
