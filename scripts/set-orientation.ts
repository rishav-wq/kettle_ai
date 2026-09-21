/*
  Marks video assets as portrait.

    npm run db:orientation                  # report, change nothing
    npm run db:orientation -- --write       # everything with a real video
    npm run db:orientation -- --write <id>  # one lesson only

  Assets written before the field existed default to landscape, which is how
  the stage has always behaved. These lessons are filmed on a phone held
  upright, so the default is wrong for all of them: a 9:16 video in a 16:9 box
  is a thin strip with black down both sides, occupying about a third of the
  space it was given.

  Only assets with a real video are touched. A TODO placeholder has no shape
  to be wrong about, and guessing now would be a guess to unpick later when
  the real one is linked.

  Anything that is actually landscape can be flipped back in the editor —
  every lesson has a Shape control next to its video link.
*/
import "./load-env";
import { PUBLIC_TENANT, withTenant } from "../src/lib/db/scope";
import type { LessonDoc, VideoAssetDoc } from "../src/lib/db/documents";
import { getClient } from "../src/lib/db/mongo";

const args = process.argv.slice(2);
const write = args.includes("--write");
const onlyLesson = args.find((a) => !a.startsWith("--"));

async function main() {
  await withTenant(
    PUBLIC_TENANT,
    async (db) => {
      const lessons = await db.find<LessonDoc>(
        "lessons",
        onlyLesson ? { id: onlyLesson } : {},
        { sort: { categoryId: 1, sortOrder: 1 } }
      );
      const assetIds = lessons.map((l) => l.videoAssetId).filter((id): id is string => Boolean(id));
      const assets = assetIds.length ? await db.find<VideoAssetDoc>("video_assets", { id: { $in: assetIds } }) : [];
      const byId = new Map(assets.map((a) => [a.id, a]));

      const targets = lessons.filter((l) => {
        const a = l.videoAssetId ? byId.get(l.videoAssetId) : undefined;
        return a && a.providerRef && !a.providerRef.startsWith("TODO") && a.orientation !== "portrait";
      });

      console.log(`${lessons.length} lesson(s) looked at, ${targets.length} with a real video not yet marked portrait`);
      for (const l of targets) {
        const a = byId.get(l.videoAssetId!)!;
        console.log(`  ${l.id.padEnd(24)} ${a.providerRef}  ${a.orientation ?? "(unset, so landscape)"} -> portrait`);
      }

      if (targets.length === 0) return;
      if (!write) {
        console.log("\nDry run. Pass --write to apply.");
        return;
      }

      for (const l of targets) {
        await db.updateOne<VideoAssetDoc>("video_assets", { id: l.videoAssetId! }, { $set: { orientation: "portrait" } });
      }
      console.log(`\nMarked ${targets.length} asset(s) portrait.`);
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
