/*
  One-time migration: category > course > lesson becomes category > lesson.

    npm run db:flatten           # report what it would do, change nothing
    npm run db:flatten -- --write

  Lesson ids are never touched, which is the whole point: progress rows and the
  free-watch log reference lessons by id, so flattening the layer above them
  leaves every learner's history intact.

  What moves:
    course.categoryId   -> lesson.categoryId
    course.isPublished  -> lesson.isPublished
    course.imageUrl     -> lesson.imageUrl, as fallback art for lessons whose
                           video is still TODO and which therefore have no
                           YouTube thumbnail to show
    course.description  -> the category, only where that category had exactly
                           one course and there is no ambiguity about whose
                           description it was

  Lessons are renumbered sequentially within their category, in the order their
  courses were in, so the flat list reads in the order it was written.

  Idempotent. A second run finds no courses and says so. Safe to run against a
  database that has already been flattened.

  Delete this script once every database that matters has been through it.
*/
import "./load-env";
import { PUBLIC_TENANT, withTenant } from "../src/lib/db/scope";
import type { CategoryDoc, LessonDoc } from "../src/lib/db/documents";
import { getClient, getDb } from "../src/lib/db/mongo";

/** The shape courses had. Declared here because the type is gone from the app. */
type LegacyCourse = {
  id: string;
  categoryId: string;
  titleEn: string;
  descriptionHi: string | null;
  descriptionEn: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isPublished: boolean;
};
type LegacyLesson = LessonDoc & { courseId?: string };

const write = process.argv.includes("--write");

async function main() {
  const raw = await getDb();
  const courses = (await raw.collection("courses").find({}).sort({ sortOrder: 1 }).toArray()) as unknown as LegacyCourse[];

  if (courses.length === 0) {
    console.log("No courses found. Either this database is already flat, or it was never seeded.");
    await (await getClient()).close();
    return;
  }

  const byId = new Map(courses.map((c) => [c.id, c]));
  const coursesInCategory = new Map<string, LegacyCourse[]>();
  for (const c of courses) {
    const list = coursesInCategory.get(c.categoryId) ?? [];
    list.push(c);
    coursesInCategory.set(c.categoryId, list);
  }

  await withTenant(
    PUBLIC_TENANT,
    async (db) => {
      const lessons = (await db.find<LegacyLesson>("lessons", {})) as LegacyLesson[];

      /*
        Order first, across the whole category, before writing anything. The
        new sortOrder depends on every sibling, so it cannot be computed one
        lesson at a time.
      */
      const planned: { id: string; categoryId: string; sortOrder: number; isPublished: boolean; imageUrl: string | null }[] = [];
      const orphans: string[] = [];

      for (const [categoryId, list] of coursesInCategory) {
        let n = 0;
        for (const course of list) {
          const own = lessons
            .filter((l) => l.courseId === course.id)
            .sort((a, b) => a.sortOrder - b.sortOrder);
          for (const l of own) {
            planned.push({
              id: l.id,
              categoryId,
              sortOrder: ++n,
              isPublished: course.isPublished,
              imageUrl: l.imageUrl ?? course.imageUrl ?? null,
            });
          }
        }
      }

      for (const l of lessons) {
        if (!l.courseId) continue;
        if (!byId.has(l.courseId)) orphans.push(l.id);
      }

      console.log(`${courses.length} courses, ${lessons.length} lessons, ${coursesInCategory.size} categories with content`);
      for (const [categoryId, list] of coursesInCategory) {
        const moved = planned.filter((p) => p.categoryId === categoryId).length;
        console.log(`  ${categoryId.padEnd(14)} ${String(list.length).padStart(2)} course(s) -> ${moved} lessons`);
      }
      if (orphans.length) {
        console.log(`\n${orphans.length} lesson(s) point at a course that does not exist and will be left alone:`);
        for (const id of orphans) console.log(`  ${id}`);
      }

      if (!write) {
        console.log("\nDry run. Pass --write to apply.");
        return;
      }

      for (const p of planned) {
        await db.updateOne<LessonDoc>(
          "lessons",
          { id: p.id },
          {
            $set: { categoryId: p.categoryId, sortOrder: p.sortOrder, isPublished: p.isPublished, imageUrl: p.imageUrl },
            $unset: { courseId: "" },
          } as never
        );
      }

      // Categories gain the fields they inherit from the layer above.
      for (const [categoryId, list] of coursesInCategory) {
        const only = list.length === 1 ? list[0] : null;
        await db.updateOne<CategoryDoc>(
          "categories",
          { id: categoryId },
          {
            $set: {
              tenantId: null,
              ...(only ? { descriptionHi: only.descriptionHi ?? null, descriptionEn: only.descriptionEn ?? null } : {}),
            },
          }
        );
      }
      // Every other category still needs the new tenant field.
      await db.updateMany<CategoryDoc>("categories", { tenantId: { $exists: false } }, { $set: { tenantId: null } });

      console.log(`\nMoved ${planned.length} lessons.`);
    },
    { bypass: true }
  );

  if (write) {
    /*
      The collection goes last, and only after the lessons have been rewritten.
      Dropping it first would leave no way to recover the mapping if anything
      below it failed.
    */
    await raw.collection("courses").drop();
    console.log("Dropped the courses collection.");
  }

  await (await getClient()).close();
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  }
);
