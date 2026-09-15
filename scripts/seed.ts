/*
  Loads content/kettle-content.json into MongoDB.

  This is a bootstrap, not the source of truth. The admin panel is — since
  content can be written from /admin, a seed that ran unconditionally would
  quietly undo an afternoon of editing, and the person who noticed would be a
  learner. So it refuses against a database that already has courses.

    npm run db:seed              # first run, or a fresh database
    npm run db:seed -- --force   # deliberately overwrite from the file

  What it still is: the fixture a clean checkout starts from, and the fastest
  way to put a known catalogue in front of local work. What it is not: a thing
  to run on a deploy.

  Upserts by id, so --force does not delete anything the file has stopped
  mentioning; removing a lesson is still a job for the admin panel.
*/
import "./load-env";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { PUBLIC_TENANT, withTenant } from "../src/lib/db/scope";
import type { CategoryDoc, CourseDoc, LessonDoc, TenantDoc, VideoAssetDoc } from "../src/lib/db/documents";
import { youtubeId } from "../src/lib/video/embed";
import { getClient } from "../src/lib/db/mongo";

type LessonIn = {
  id: string;
  titleHi: string;
  titleEn: string;
  video: string;
  durationSec: number;
  isFree?: boolean;
  transcriptHi?: string;
  transcriptEn?: string;
};
type CourseIn = {
  id: string;
  categoryId: string;
  titleHi: string;
  titleEn: string;
  descriptionHi?: string;
  descriptionEn?: string;
  imageUrl?: string;
  sortOrder: number;
  isPublished: boolean;
  lessons: LessonIn[];
};
type Content = {
  categories: Array<{ id: string; nameHi: string; nameEn: string; blurbHi?: string; blurbEn?: string; sortOrder: number }>;
  courses: CourseIn[];
};

const file = path.join(process.cwd(), "content", "kettle-content.json");
const content = JSON.parse(readFileSync(file, "utf8")) as Content;

const freeCount = content.courses.flatMap((c) => c.lessons).filter((l) => l.isFree).length;
if (freeCount !== 4) {
  throw new Error(`Exactly 4 lessons must be free. Found ${freeCount}.`);
}

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
      const existing = await db.countDocuments<CourseDoc>("courses", {});
      if (existing > 0 && !force) {
        throw new Error(
          `Refusing to seed: ${existing} courses already exist.\n` +
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
              nameHi: c.nameHi,
              nameEn: c.nameEn,
              blurbHi: c.blurbHi ?? null,
              blurbEn: c.blurbEn ?? null,
              sortOrder: c.sortOrder,
            },
          },
          { upsert: true }
        );
      }

      for (const c of content.courses) {
        await db.updateOne<CourseDoc>(
          "courses",
          { id: c.id },
          {
            $set: {
              id: c.id,
              // Null means global content, visible to every tenant.
              tenantId: null,
              categoryId: c.categoryId,
              titleHi: c.titleHi,
              titleEn: c.titleEn,
              descriptionHi: c.descriptionHi ?? null,
              descriptionEn: c.descriptionEn ?? null,
              imageUrl: c.imageUrl ?? null,
              sortOrder: c.sortOrder,
              isPublished: c.isPublished,
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
          const existing = await db.findOne<LessonDoc>("lessons", { id: l.id });
          const assetId = existing?.videoAssetId ?? randomUUID();

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
                courseId: c.id,
                sortOrder: i + 1,
                titleHi: l.titleHi,
                titleEn: l.titleEn,
                videoAssetId: assetId,
                transcriptHi: l.transcriptHi ?? null,
                transcriptEn: l.transcriptEn ?? null,
                isFree: l.isFree ?? false,
              },
            },
            { upsert: true }
          );
        }
      }
    },
    { bypass: true }
  );

  console.log(
    `Seeded ${content.categories.length} categories, ${content.courses.length} courses, ${content.courses.reduce((n, c) => n + c.lessons.length, 0)} lessons.`
  );

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
