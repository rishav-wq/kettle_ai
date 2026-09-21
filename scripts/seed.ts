/*
  Loads content/kettle-content.json into MongoDB.

  This is a bootstrap, not the source of truth. The admin panel is — since
  content can be written from /admin, a seed that ran unconditionally would
  quietly undo an afternoon of editing, and the person who noticed would be a
  learner. So it refuses against a database that already has lessons.

    npm run db:seed              # first run, or a fresh database
    npm run db:seed -- --force   # deliberately overwrite from the file

  What it still is: the fixture a clean checkout starts from, and the fastest
  way to put a known catalogue in front of local work. What it is not: a thing
  to run on a deploy.

  Upserts by id, so --force does not delete anything the file has stopped
  mentioning; removing a lesson is still a job for the admin panel.

  Two levels, category then lesson. Courses were flattened away; see the note
  on CategoryDoc in src/lib/db/documents.ts.
*/
import "./load-env";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { PUBLIC_TENANT, withTenant } from "../src/lib/db/scope";
import type { CategoryDoc, LessonDoc, TenantDoc, VideoAssetDoc } from "../src/lib/db/documents";
import { youtubeId } from "../src/lib/video/embed";
import { getClient } from "../src/lib/db/mongo";

type LessonIn = {
  id: string;
  titleHi: string;
  titleEn: string;
  video: string;
  durationSec: number;
  isFree?: boolean;
  isPublished?: boolean;
  imageUrl?: string;
  transcriptHi?: string;
  transcriptEn?: string;
  sortOrder?: number;
};
type CategoryIn = {
  id: string;
  nameHi: string;
  nameEn: string;
  blurbHi?: string;
  blurbEn?: string;
  descriptionHi?: string;
  descriptionEn?: string;
  sortOrder: number;
  lessons: LessonIn[];
};
type Content = { categories: CategoryIn[] };

const file = path.join(process.cwd(), "content", "kettle-content.json");
const content = JSON.parse(readFileSync(file, "utf8")) as Content;

const allLessons = content.categories.flatMap((c) => c.lessons);
const freeCount = allLessons.filter((l) => l.isFree).length;
if (freeCount !== 4) {
  throw new Error(`Exactly 4 lessons must be free. Found ${freeCount}.`);
}

const duplicate = allLessons.map((l) => l.id).find((id, i, a) => a.indexOf(id) !== i);
if (duplicate) throw new Error(`Lesson ids must be unique across the whole catalogue. Found "${duplicate}" twice.`);

const force = process.argv.includes("--force");

async function main() {
  await withTenant(
    PUBLIC_TENANT,
    async (db) => {
      /*
        The guard. Counted rather than checked for emptiness so the message can
        say how much is at stake, which is the difference between a warning
        someone reads and one they retry past.
      */
      const existing = await db.countDocuments<LessonDoc>("lessons", {});
      if (existing > 0 && !force) {
        throw new Error(
          `Refusing to seed: ${existing} lessons already exist.\n` +
            `The admin panel is the source of truth now — seeding would overwrite edits made there.\n` +
            `Pass --force if you really mean to write content/kettle-content.json over them.`
        );
      }

      const existingTenant = await db.findOne<TenantDoc>("tenants", { id: PUBLIC_TENANT });
      if (!existingTenant) {
        await db.insertOne<TenantDoc>("tenants", {
          id: PUBLIC_TENANT,
          name: "Kettle",
          type: "individual",
          createdAt: new Date(),
        });
      }

      for (const c of content.categories) {
        await db.updateOne<CategoryDoc>(
          "categories",
          { id: c.id },
          {
            $set: {
              id: c.id,
              // Null means global: visible to every tenant. See collections.ts.
              tenantId: null,
              nameHi: c.nameHi,
              nameEn: c.nameEn,
              blurbHi: c.blurbHi ?? null,
              blurbEn: c.blurbEn ?? null,
              descriptionHi: c.descriptionHi ?? null,
              descriptionEn: c.descriptionEn ?? null,
              sortOrder: c.sortOrder,
            },
          },
          { upsert: true }
        );

        for (const [i, l] of c.lessons.entries()) {
          /*
            The content file may hold a pasted YouTube link in any of its
            shapes; only the eleven character id is stored. A link that cannot
            be read is a typo, and a typo that seeds quietly becomes a lesson
            that renders "video being added" with nothing to say why, so it
            stops the seed.
          */
          const ref = l.video.startsWith("TODO") ? l.video : youtubeId(l.video);
          if (!ref) throw new Error(`${l.id}: cannot read a YouTube id from ${JSON.stringify(l.video)}`);

          // One asset per lesson. Reuse it if the lesson already points somewhere.
          const existingLesson = await db.findOne<LessonDoc>("lessons", { id: l.id });
          const assetId = existingLesson?.videoAssetId ?? randomUUID();

          await db.updateOne<VideoAssetDoc>(
            "video_assets",
            { id: assetId },
            { $set: { id: assetId, provider: "youtube", providerRef: ref, durationSec: l.durationSec } },
            { upsert: true }
          );

          await db.updateOne<LessonDoc>(
            "lessons",
            { id: l.id },
            {
              $set: {
                id: l.id,
                categoryId: c.id,
                sortOrder: l.sortOrder ?? i + 1,
                titleHi: l.titleHi,
                titleEn: l.titleEn,
                videoAssetId: assetId,
                transcriptHi: l.transcriptHi ?? null,
                transcriptEn: l.transcriptEn ?? null,
                isFree: l.isFree ?? false,
                isPublished: l.isPublished !== false,
                imageUrl: l.imageUrl ?? null,
              },
            },
            { upsert: true }
          );
        }
      }
    },
    { bypass: true }
  );

  console.log(`Seeded ${content.categories.length} categories and ${allLessons.length} lessons.`);

  // The driver keeps the process alive until the pool is closed.
  await (await getClient()).close();
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  }
);
