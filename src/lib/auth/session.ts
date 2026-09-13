import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db/mongo";
import type { SessionDoc } from "@/lib/db/documents";
import { isProd } from "@/lib/env";

/*
  Server-side sessions.

  The cookie carries an opaque random token. The database stores only its
  SHA-256 hash, so a database leak does not hand anyone a working session.
  Sessions are documents, not signed blobs, which means "log out everywhere"
  and immediate revocation both work without a token blacklist.

  Session lookup happens before we know the tenant, so this module is one of
  the few places that touches the database outside withTenant() — there is no
  tenant to scope by until the session itself tells us which one.
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
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_DAYS * 864e5);

  const db = await getDb();
  await db.collection<SessionDoc>("sessions").insertOne({
    tokenHash: hash(token),
    userId,
    tenantId,
    createdAt: now,
    expiresAt,
    lastSeenAt: now,
  });

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax", // lax, not strict, so a WhatsApp link into the app keeps the session
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Resolves the current session, or null.
 *
 * The expiry is part of the query rather than checked afterwards, so an
 * expired token is indistinguishable from an unknown one and no code path can
 * accidentally use a session it should have rejected.
 */
export async function readSession(): Promise<SessionRow | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const db = await getDb();
  const row = await db
    .collection<SessionDoc>("sessions")
    .findOne({ tokenHash: hash(token), expiresAt: { $gt: new Date() } }, { projection: { userId: 1, tenantId: 1 } });

  return row ? { userId: row.userId, tenantId: row.tenantId } : null;
}

/** Clears the current session, both the document and the cookie. */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.collection<SessionDoc>("sessions").deleteOne({ tokenHash: hash(token) });
  }
  jar.delete(COOKIE);
}

/** Ends every session for one user. Used by account deletion and "sign out everywhere". */
export async function destroyAllSessions(userId: string): Promise<void> {
  const db = await getDb();
  await db.collection<SessionDoc>("sessions").deleteMany({ userId });
}

/** Housekeeping for expired documents. Cheap enough to call opportunistically. */
export async function sweepExpiredSessions(): Promise<void> {
  const db = await getDb();
  await db.collection<SessionDoc>("sessions").deleteMany({ expiresAt: { $lt: new Date() } });
}
