import "server-only";
import { env } from "@/lib/env";
import { withTenant } from "@/lib/db/tenant";
import type { UserDoc } from "@/lib/db/documents";
import { getViewer, type Viewer } from "@/lib/viewer";
import { ForbiddenError } from "@/lib/security/request";

/*
  Who may edit the catalogue.

  An allow-list of phone numbers in the environment, deliberately not a role
  column on the user.

  The reason is the threat that actually exists here rather than the tidiest
  data model. The Atlas cluster holds another application's data and its
  password is weak; a role flag in the database would mean anyone who reached
  that database could make themselves an editor of the catalogue and publish a
  lesson pointing at any video they liked, to an audience being taught to trust
  this product. A number in the environment cannot be written to from inside
  the app at all — changing who is an admin means changing the deploy, which is
  the correct amount of friction for a one-person product.

  It also means there is no admin-management UI to build, and no way to lock
  yourself out of one.

  Identity is still the session. This only decides what that identity may do.
*/

/** Parsed once. Blank or unset means nobody is an admin, which is the safe default. */
const ADMINS: ReadonlySet<string> = new Set(
  (env.ADMIN_PHONES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

export function adminPhoneCount(): number {
  return ADMINS.size;
}

/** Phones are stored in E.164 and compared as written. No normalising here: the env is typed by hand, once. */
export function isAdminPhone(phone: string | null | undefined): boolean {
  return Boolean(phone && ADMINS.has(phone));
}

export type AdminViewer = Viewer & { userId: string; phone: string };

/**
 * The viewer if they may edit the catalogue, otherwise null.
 *
 * Reads the phone from the database rather than trusting anything on the
 * session, because the session carries no phone and should not start to: the
 * one fact this decision turns on is worth a read.
 */
export async function getAdmin(): Promise<AdminViewer | null> {
  const viewer = await getViewer();
  if (!viewer.userId) return null;
  if (ADMINS.size === 0) return null;

  const me = await withTenant(viewer.tenantId, (db) => db.findOne<UserDoc>("users", { id: viewer.userId! }));
  if (!me || !isAdminPhone(me.phone)) return null;

  return { ...viewer, userId: viewer.userId, phone: me.phone };
}

/**
 * The same, for a route handler. Throws the 403 rather than returning null.
 *
 * Every /api/admin route calls this first, before parsing a body: there is no
 * reason to spend validation on a request that is not allowed to happen.
 */
export async function requireAdmin(): Promise<AdminViewer> {
  const admin = await getAdmin();
  if (!admin) throw new ForbiddenError("not_admin");
  return admin;
}

/**
 * The four things every admin mutation does before it touches anything.
 *
 * Order matters and is the same as the rest of the app: reject a cross-site
 * request before asking who it is, establish who it is before spending a rate
 * limit slot on them, and do all three before parsing a body.
 */
export async function adminPreamble(req: Request): Promise<{ admin: AdminViewer; ip: string }> {
  const { assertSameOrigin, clientIp } = await import("@/lib/security/request");
  const { enforceRate, LIMITS } = await import("@/lib/security/rate-limit");

  await assertSameOrigin(req);
  const admin = await requireAdmin();
  await enforceRate(`admin:${admin.userId}`, LIMITS.adminWrite);
  return { admin, ip: await clientIp() };
}
