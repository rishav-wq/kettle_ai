/*
  What the database actually holds for the accounts that exist.

  A read-only look at where a sign-in ends up: the user row, the session rows
  behind it, and the audit trail that records how the number was proven. Run it
  with the dev server stopped — PGlite allows a single writer, and two
  processes on one directory is what corrupted this database once already.
*/
import { desc, eq } from "drizzle-orm";
import { PUBLIC_TENANT, auditLog, sessions, users } from "../src/lib/db/schema";
import { withTenant } from "../src/lib/db/tenant";

async function main() {
  await withTenant(PUBLIC_TENANT, async (tx) => {
    const rows = await tx
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        lang: users.lang,
        whatsappOptIn: users.whatsappOptIn,
        referredByCode: users.referredByCode,
        consentAt: users.consentAt,
        lastSeenAt: users.lastSeenAt,
      })
      .from(users)
      .orderBy(desc(users.lastSeenAt));

    console.log(`users: ${rows.length}\n`);
    for (const u of rows) {
      const live = await tx.select({ h: sessions.tokenHash }).from(sessions).where(eq(sessions.userId, u.id));
      console.log(`  name          ${u.name}`);
      console.log(`  phone         ${u.phone}`);
      console.log(`  language      ${u.lang}`);
      console.log(`  whatsapp      ${u.whatsappOptIn ? "opted in" : "no"}`);
      console.log(`  referred by   ${u.referredByCode ?? "—"}`);
      console.log(`  consent at    ${u.consentAt?.toISOString() ?? "—"}`);
      console.log(`  sessions      ${live.length} (only a SHA-256 of each cookie is stored)`);
      console.log("");
    }

    const trail = await tx
      .select({ action: auditLog.action, meta: auditLog.meta, at: auditLog.createdAt })
      .from(auditLog)
      .orderBy(desc(auditLog.createdAt))
      .limit(6);

    console.log("audit trail (most recent first):");
    for (const a of trail) {
      console.log(`  ${a.at?.toISOString() ?? "?"}  ${a.action}  ${JSON.stringify(a.meta ?? {})}`);
    }
  });
}

void main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
