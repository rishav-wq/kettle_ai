import "server-only";
import { env } from "@/lib/env";
import { withTenant } from "@/lib/db/tenant";
import type { UserDoc } from "@/lib/db/documents";
import { getViewer, type Viewer } from "@/lib/viewer";
import { ForbiddenError } from "@/lib/security/request";
import { indianPhone } from "@/lib/security/validators";

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

/*
  Both sides go through the same normaliser the sign-in form uses.

  Comparing as written was the obvious thing and it was a trap. Phones are
  stored as +91XXXXXXXXXX, but the number a person types into a hosting
  dashboard is whatever is in their head — 9876543210, 09876543210,
  91 98765 43210. Every one of those would have failed to match, silently, with
  no way to tell it apart from the variable not being set at all. There is no
  security in being strict here: the value is the secret, not its punctuation.

  Anything that cannot be read as an Indian mobile is dropped and named in the
  log, because a typo in this variable means the editor is unreachable and
  nothing else in the app would ever mention it.
*/
const ADMINS: ReadonlySet<string> = new Set(
  (env.ADMIN_PHONES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => {
      const parsed = indianPhone.safeParse(raw);
      if (parsed.success) return parsed.data;
      console.error(`[admin] ADMIN_PHONES entry is not a readable Indian mobile and was ignored: ${JSON.stringify(raw)}`);
      return null;
    })
    .filter((p): p is string => p !== null)
);

/*
  Said once, at boot, in the server log.

  This variable is the only thing in the product whose being wrong produces no
  symptom at all: the editor is simply not there, exactly as it looks when
  nobody is meant to be an admin. There is nowhere in the interface it would be
  safe to explain that, so it is explained here, where the person who set it
  can read it.

  The count, never the numbers. Knowing one is configured is what tells you the
  variable arrived; which one it is belongs in the dashboard you typed it into.
*/
if (process.env.NODE_ENV !== "test") {
  console.log(
    ADMINS.size === 0
      ? "[admin] ADMIN_PHONES is unset or empty — /admin is unreachable for everyone, which is correct unless you meant otherwise."
      : `[admin] ${ADMINS.size} phone number${ADMINS.size === 1 ? "" : "s"} may edit the catalogue.`
  );
}

export function adminPhoneCount(): number {
  return ADMINS.size;
}

/** True when this phone is on the list, whatever shape either side was written in. */
export function isAdminPhone(phone: string | null | undefined): boolean {
  if (!phone || ADMINS.size === 0) return false;
  const parsed = indianPhone.safeParse(phone);
  return ADMINS.has(parsed.success ? parsed.data : phone);
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
  if (!me) return null;

  if (!isAdminPhone(me.phone)) {
    /*
      Only when someone actually asks for the editor — getAdmin is called by
      /admin and the /api/admin routes, not on ordinary pages, so this does not
      log every learner on every screen. It logs the person who went looking
      for a door that did not open, which is the one case worth explaining.
    */
    console.warn(`[admin] ${me.phone} is signed in but is not in ADMIN_PHONES (${ADMINS.size} configured).`);
    return null;
  }

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
