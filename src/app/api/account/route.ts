import { z } from "zod";
import { assertSameOrigin, clientIp, toErrorResponse } from "@/lib/security/request";
import { displayName, lang as langSchema, parseBody } from "@/lib/security/validators";
import { withTenant } from "@/lib/db/tenant";
import type { FreeWatchDoc, MembershipDoc, PaymentDoc, ProgressDoc, ReferralCodeDoc, UserDoc } from "@/lib/db/documents";
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

    await withTenant(viewer.tenantId, (db) => db.updateOne<UserDoc>("users", { id: viewer.userId! }, { $set: body }));
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
 * Order still matters, though MongoDB enforces no foreign keys: unhook the
 * payments first so nothing points at a membership that is about to go, then
 * remove the rest, then the user. Nothing here would stop a half-finished
 * delete, so the audit entry is written before anything is removed.
 */
export async function DELETE(req: Request) {
  try {
    await assertSameOrigin(req);
    const viewer = await getViewer();
    if (!viewer.userId) return Response.json({ error: "not_signed_in" }, { status: 401 });

    const userId = viewer.userId;
    const ip = await clientIp();

    await withTenant(viewer.tenantId, async (db) => {
      // Written first so the record of the deletion survives the deletion.
      await audit(db, { tenantId: viewer.tenantId, actorUserId: userId, action: "account.deleted", targetType: "user", targetId: userId, ip });

      // The financial record stays; only the link to the person is severed.
      await db.updateMany<PaymentDoc>("payments", { userId }, { $set: { userId: null, membershipId: null } });
      await db.deleteMany<MembershipDoc>("memberships", { userId });
      await db.deleteMany<ProgressDoc>("progress", { userId });
      await db.deleteMany<FreeWatchDoc>("free_watch_log", { userId });
      await db.deleteMany<ReferralCodeDoc>("referral_codes", { userId });
      await db.deleteOne<UserDoc>("users", { id: userId });
    });

    // Postgres cascaded sessions off the user row; MongoDB has no cascade, so
    // destroyAllSessions is now load-bearing rather than belt-and-braces.
    await destroyAllSessions(userId);
    await destroySession();
    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
