/*
  Proves tenant isolation holds.

  This replaces scripts/check-rls.ts, and it is weaker in a way worth stating
  plainly. That script proved *Postgres* refused to return another tenant's
  rows: the guarantee held for any query, including one typed into a console,
  because row-level security was enforced below the application. MongoDB has no
  equivalent, so isolation is now the application's job and this checks the
  application does it.

  What that means in practice: these checks pass only for code that goes
  through withTenant(). A raw driver call somewhere outside src/lib/db would
  bypass every one of them and this script would not notice. The compensating
  control is that nothing outside src/lib/db imports the driver — which is one
  grep, and worth running alongside this.

    npm run check:tenancy
*/
import "./load-env";
import { randomUUID } from "node:crypto";
import { withTenant } from "../src/lib/db/scope";
import type { CourseDoc, UserDoc } from "../src/lib/db/documents";
import { getClient, getDb } from "../src/lib/db/mongo";

let pass = 0;
let fail = 0;

function check(ok: boolean, label: string, extra = "") {
  console.log(`${ok ? "ok  " : "FAIL"}: ${label}${extra ? ` ${extra}` : ""}`);
  if (ok) pass++;
  else fail++;
}

const A = "checka";
const B = "checkb";

function makeUser(tenantId: string, phone: string): UserDoc {
  const now = new Date();
  return {
    id: randomUUID(),
    tenantId,
    phone,
    name: "Isolation Test",
    lang: "en",
    preferredCategoryId: null,
    city: null,
    consentAt: now,
    onboardedAt: null,
    referredByCode: null,
    referralRewardedAt: null,
    whatsappOptIn: false,
    createdAt: now,
    lastSeenAt: now,
  };
}

async function main() {
  const phoneA = `+9199${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
  const phoneB = `+9199${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;

  const userA = makeUser(A, phoneA);
  const userB = makeUser(B, phoneB);

  await withTenant(A, (db) => db.insertOne<UserDoc>("users", userA));
  await withTenant(B, (db) => db.insertOne<UserDoc>("users", userB));

  // 1. Each tenant sees its own person.
  const ownA = await withTenant(A, (db) => db.findOne<UserDoc>("users", { id: userA.id }));
  check(ownA?.id === userA.id, "a tenant can read its own user");

  // 2. Neither can read the other's, even asking for it by id.
  const crossA = await withTenant(A, (db) => db.findOne<UserDoc>("users", { id: userB.id }));
  check(crossA === null, "one tenant cannot read another's user by id");

  const crossList = await withTenant(A, (db) => db.find<UserDoc>("users", { phone: phoneB }));
  check(crossList.length === 0, "one tenant cannot find another's user by phone");

  // 3. A write is stamped with the caller's tenant, not whatever it claims.
  const smuggled = makeUser(B, `+9199${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`);
  await withTenant(A, (db) => db.insertOne<UserDoc>("users", smuggled));
  const landed = await withTenant(A, (db) => db.findOne<UserDoc>("users", { id: smuggled.id }));
  check(landed?.tenantId === A, "a document claiming another tenant is stamped with the caller's", `→ ${landed?.tenantId}`);

  const notInB = await withTenant(B, (db) => db.findOne<UserDoc>("users", { id: smuggled.id }));
  check(notInB === null, "so it never appears in the tenant it claimed");

  // 4. An update cannot reach across either.
  const reached = await withTenant(A, (db) => db.updateOne<UserDoc>("users", { id: userB.id }, { $set: { name: "changed" } }));
  const untouched = await withTenant(B, (db) => db.findOne<UserDoc>("users", { id: userB.id }));
  check(reached === 0 && untouched?.name === "Isolation Test", "one tenant cannot update another's user");

  // 5. A delete cannot either.
  const deleted = await withTenant(A, (db) => db.deleteOne<UserDoc>("users", { id: userB.id }));
  const stillThere = await withTenant(B, (db) => db.findOne<UserDoc>("users", { id: userB.id }));
  check(deleted === 0 && stillThere !== null, "one tenant cannot delete another's user");

  // 6. Global content stays visible to everyone. Courses carry tenantId null.
  const seenFromA = await withTenant(A, (db) => db.countDocuments<CourseDoc>("courses", { isPublished: true }));
  const seenFromB = await withTenant(B, (db) => db.countDocuments<CourseDoc>("courses", { isPublished: true }));
  check(seenFromA === seenFromB, "global content is visible from every tenant", `${seenFromA} / ${seenFromB}`);

  // Clean up after ourselves.
  const db = await getDb();
  await db.collection<UserDoc>("users").deleteMany({ tenantId: { $in: [A, B] } });

  console.log(fail === 0 ? "\nTenancy checks passed." : `\n${fail} FAILED, ${pass} passed.`);
  await (await getClient()).close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
