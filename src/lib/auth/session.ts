import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { isProd } from "@/lib/env";

/*
  Server-side sessions.

  The cookie carries an opaque random token. The database stores only its
  SHA-256 hash, so a database leak does not hand anyone a working session.
  Sessions are rows, not signed blobs, which means "log out everywhere" and
  immediate revocation both work without a token blacklist.

  Session lookup happens before we know the tenant, so this module is one of
  the few places that touches the database outside withTenant(). See the note
  on the sessions table in schema.ts.
*/

const COOKIE = isProd ? "__Host-kettle_session" : "kettle_session";
const TTL_DAYS = 60;

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type SessionRow = { userId: string; tenantId: string };

/** Issues a new session and sets the cookie. Call only after the phone is verified. */
export async function createSession(userId: string, tenantId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_DAYS * 864e5);

  const db = await getDb();
  await db.insert(sessions).values({ tokenHash: hash(token), userId, tenantId, expiresAt });

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax", // lax, not strict, so a WhatsApp link into the app keeps the session
    path: "/",
    expires: expiresAt,
  });
}

/** Resolves the current session, or null. Sweeps the row if it has expired. */
export async function readSession(): Promise<SessionRow | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const db = await getDb();
  const [row] = await db
    .select({ userId: sessions.userId, tenantId: sessions.tenantId })
    .from(sessions)
    .where(and(eq(sessions.tokenHash, hash(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return row ?? null;
}

/** Clears the current session, both the row and the cookie. */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.tokenHash, hash(token)));
  }
  jar.delete(COOKIE);
}

/** Ends every session for one user. Used by account deletion and "sign out everywhere". */
export async function destroyAllSessions(userId: string): Promise<void> {
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Housekeeping for expired rows. Cheap enough to call opportunistically. */
export async function sweepExpiredSessions(): Promise<void> {
  const db = await getDb();
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
