/*
  Repoints lesson artwork from /courses/ to /art/.

    npm run db:move-art           # report, change nothing
    npm run db:move-art -- --write

  Two reasons it moved.

  The directory was named after a thing that no longer exists — courses were
  flattened into categories — and the art is a placeholder for a lesson with
  no video yet.

  The sharper reason: the /courses/:slug redirect added when courses were
  removed also matched /courses/ai-in-whatsapp.svg, so every one of these
  answered 308 and every lesson still waiting on a video rendered a blank
  card. A page-URL redirect and a static asset path should not share a prefix.
  The redirect is now restricted to slug-shaped segments as well, but the real
  fix is that they no longer collide at all.

  Idempotent: paths already under /art/ are left alone. Delete this once every
  database has been through it.
*/
import "./load-env";
import { PUBLIC_TENANT, withTenant } from "../src/lib/db/scope";
import type { LessonDoc } from "../src/lib/db/documents";
import { getClient } from "../src/lib/db/mongo";

const write = process.argv.includes("--write");

async function main() {
  await withTenant(
    PUBLIC_TENANT,
    async (db) => {
      const stale = await db.find<LessonDoc>("lessons", { imageUrl: { $regex: "^/courses/" } });
      console.log(`${stale.length} lesson(s) still point at /courses/`);
      for (const l of stale.slice(0, 5)) console.log(`  ${l.id.padEnd(24)} ${l.imageUrl}`);
      if (stale.length > 5) console.log(`  … and ${stale.length - 5} more`);

      if (!write) {
        console.log("\nDry run. Pass --write to apply.");
        return;
      }

      for (const l of stale) {
        await db.updateOne<LessonDoc>("lessons", { id: l.id }, { $set: { imageUrl: l.imageUrl!.replace("/courses/", "/art/") } });
      }
      console.log(`\nRepointed ${stale.length} lesson(s).`);
    },
    { bypass: true }
  );
  await (await getClient()).close();
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  }
);
