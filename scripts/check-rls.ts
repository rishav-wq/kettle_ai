/*
  Proves the tenant isolation actually holds, against the same database the app uses.

    npx tsx scripts/check-rls.ts

  1. In the app role with no tenant set, a query sees zero users. Fail closed.
  2. Tenant A sees only its own user, and cannot write into tenant B.
  3. The public tenant sees none of the org users.
  4. Global courses are visible from any tenant.
*/
import { sql } from "drizzle-orm";
import { getDb } from "../src/lib/db";
import { withTenant, APP_ROLE } from "../src/lib/db/tenant";
import { courses, tenants, users } from "../src/lib/db/schema";

let failed = false;
function check(cond: unknown, msg: string) {
  console.log(cond ? "ok  :" : "FAIL:", msg);
  if (!cond) failed = true;
}

async function main() {
  const db = await getDb();

  await withTenant(
    "public",
    async (tx) => {
      await tx
        .insert(tenants)
        .values([
          { id: "org-a", name: "Org A", type: "organization" },
          { id: "org-b", name: "Org B", type: "organization" },
        ])
        .onConflictDoNothing();
      await tx.delete(users).where(sql`phone in ('+919000000001','+919000000002','+919000000003')`);
      await tx.insert(users).values([
        { tenantId: "org-a", phone: "+919000000001", name: "A" },
        { tenantId: "org-b", phone: "+919000000002", name: "B" },
      ]);
    },
    { bypassRls: true }
  );

  // 1. App role, no tenant: zero rows.
  const noTenant = await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`set local role ${APP_ROLE}`));
    return tx.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(users);
  });
  check(noTenant[0]!.n === 0, "app role with no tenant set sees zero users (fails closed)");

  // 2. Tenant A sees only A.
  const seenByA = await withTenant("org-a", (tx) => tx.select({ phone: users.phone }).from(users));
  check(seenByA.length === 1 && seenByA[0]!.phone === "+919000000001", "org-a sees only its own user");

  let blocked = false;
  try {
    await withTenant("org-a", (tx) => tx.insert(users).values({ tenantId: "org-b", phone: "+919000000003" }));
  } catch {
    blocked = true;
  }
  check(blocked, "org-a cannot write a row into org-b");

  // 3. Public sees neither org user.
  const seenByPublic = await withTenant("public", (tx) => tx.select({ phone: users.phone }).from(users).where(sql`phone like '+9190000000%'`));
  check(seenByPublic.length === 0, "public tenant sees no org users");

  // 4. Global content visible everywhere.
  const fromB = await withTenant("org-b", (tx) => tx.select({ id: courses.id }).from(courses));
  check(fromB.length > 0, "global courses visible from org-b");

  await withTenant(
    "public",
    async (tx) => {
      await tx.delete(users).where(sql`phone in ('+919000000001','+919000000002','+919000000003')`);
    },
    { bypassRls: true }
  );

  console.log(failed ? "RLS checks FAILED." : "RLS checks passed.");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
