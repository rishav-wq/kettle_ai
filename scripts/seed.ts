/*
  Loads content/kettle-content.json into the database.

  Idempotent: rows are upserted by id, so running it twice is safe. Removing a
  lesson from the file does not delete it from the database; do that by hand.
  Runs with RLS bypassed because content is global.

    npm run db:seed
*/
import { readFileSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { withTenant, PUBLIC_TENANT } from "../src/lib/db/tenant";
import { categories, courses, lessons, tenants, videoAssets } from "../src/lib/db/schema";
import { youtubeId } from "../src/lib/video/embed";

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
  categories: Array<{ id: string; nameHi: string; nameEn: string; sortOrder: number }>;
  courses: CourseIn[];
};

const file = path.join(process.cwd(), "content", "kettle-content.json");
const content = JSON.parse(readFileSync(file, "utf8")) as Content;

const freeCount = content.courses.flatMap((c) => c.lessons).filter((l) => l.isFree).length;
if (freeCount !== 4) {
  throw new Error(`Exactly 4 lessons must be free. Found ${freeCount}.`);
}

async function main() {
await withTenant(
  PUBLIC_TENANT,
  async (tx) => {
    await tx
      .insert(tenants)
      .values({ id: PUBLIC_TENANT, name: "Kettle", type: "individual" })
      .onConflictDoNothing();

    for (const c of content.categories) {
      await tx
        .insert(categories)
        .values(c)
        .onConflictDoUpdate({ target: categories.id, set: { nameHi: c.nameHi, nameEn: c.nameEn, sortOrder: c.sortOrder } });
    }

    for (const c of content.courses) {
      const row = {
        id: c.id,
        tenantId: null,
        categoryId: c.categoryId,
        titleHi: c.titleHi,
        titleEn: c.titleEn,
        descriptionHi: c.descriptionHi ?? null,
        descriptionEn: c.descriptionEn ?? null,
        imageUrl: c.imageUrl ?? null,
        sortOrder: c.sortOrder,
        isPublished: c.isPublished,
      };
      await tx.insert(courses).values(row).onConflictDoUpdate({ target: courses.id, set: row });

      for (const [i, l] of c.lessons.entries()) {
        /*
          The content file may hold a pasted YouTube link in any of its shapes;
          only the eleven character id is stored. A link that cannot be read is
          a typo, and a typo that seeds quietly becomes a lesson that renders
          "video being added" with nothing to say why, so it stops the seed.
        */
        const ref = l.video.startsWith("TODO") ? l.video : youtubeId(l.video);
        if (!ref) throw new Error(`${l.id}: cannot read a YouTube id from ${JSON.stringify(l.video)}`);

        // One asset per lesson. Reuse it if the lesson already points somewhere.
        const [existing] = await tx.select({ videoAssetId: lessons.videoAssetId }).from(lessons).where(eq(lessons.id, l.id));
        let assetId = existing?.videoAssetId ?? null;
        if (assetId) {
          await tx.update(videoAssets).set({ provider: "youtube", providerRef: ref, durationSec: l.durationSec }).where(eq(videoAssets.id, assetId));
        } else {
          const [asset] = await tx
            .insert(videoAssets)
            .values({ provider: "youtube", providerRef: ref, durationSec: l.durationSec })
            .returning({ id: videoAssets.id });
          assetId = asset!.id;
        }
        const lrow = {
          id: l.id,
          courseId: c.id,
          sortOrder: i + 1,
          titleHi: l.titleHi,
          titleEn: l.titleEn,
          videoAssetId: assetId,
          transcriptHi: l.transcriptHi ?? null,
          transcriptEn: l.transcriptEn ?? null,
          isFree: l.isFree ?? false,
        };
        await tx.insert(lessons).values(lrow).onConflictDoUpdate({ target: lessons.id, set: lrow });
      }
    }
  },
  { bypassRls: true }
);

console.log(`Seeded ${content.categories.length} categories, ${content.courses.length} courses, ${content.courses.reduce((n, c) => n + c.lessons.length, 0)} lessons.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
