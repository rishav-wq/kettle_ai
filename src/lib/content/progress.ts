import "server-only";
import type { CategoryDoc, FreeWatchDoc, LessonDoc, ProgressDoc, VideoAssetDoc } from "@/lib/db/documents";
import type { Scoped } from "@/lib/db/scope";

/*
  Progress.

  The player sends a heartbeat every fifteen seconds while playing. We keep the
  furthest point reached rather than the latest, so scrubbing backwards does not
  erase progress. A lesson counts as complete at ninety percent watched, because
  almost nobody sits through end credits.

  Progress is tracked per lesson and rolled up per category. It used to roll up
  per course; courses were flattened away, so "finished" now means a category,
  which is a bigger unit — seventeen lessons in Stay safe online rather than
  five in Stay safe from scams. Worth knowing when reading My classes.

  Where Postgres did this with joins, MongoDB does it with a second lookup and
  a join in memory. Sixty-seven lessons is small enough that two round trips
  beat an aggregation pipeline nobody can read six months from now.
*/

export const COMPLETE_AT = 0.9;
const HEARTBEAT_SEC = 15;

export type ProgressRow = { lessonId: string; watchedSec: number; completed: boolean };

export async function getCategoryProgress(db: Scoped, userId: string, categoryId: string): Promise<Map<string, ProgressRow>> {
  const lessons = await db.find<LessonDoc>("lessons", { categoryId }, { projection: { id: 1 } });
  if (lessons.length === 0) return new Map();

  const rows = await db.find<ProgressDoc>("progress", { userId, lessonId: { $in: lessons.map((l) => l.id) } });

  return new Map(
    rows.map((r) => [r.lessonId, { lessonId: r.lessonId, watchedSec: r.watchedSec, completed: r.completedAt !== null }])
  );
}

export async function getLessonProgress(db: Scoped, userId: string, lessonId: string): Promise<ProgressRow | null> {
  const row = await db.findOne<ProgressDoc>("progress", { userId, lessonId });
  return row ? { lessonId: row.lessonId, watchedSec: row.watchedSec, completed: row.completedAt !== null } : null;
}

export type Continue = {
  lessonId: string;
  lessonTitleHi: string;
  lessonTitleEn: string;
  categoryId: string;
  categoryNameHi: string;
  categoryNameEn: string;
  sortOrder: number;
  lessonCount: number;
  watchedSec: number;
  durationSec: number;
};

/** The single most recently touched unfinished lesson. Powers "pick up where you left". */
export async function getContinue(db: Scoped, userId: string): Promise<Continue | null> {
  /*
    Walk back through recent unfinished progress rather than taking only the
    newest. The newest might belong to a lesson that has since been
    unpublished, which in SQL the INNER JOIN silently skipped; here it has to
    be skipped deliberately or the card would point at something a visitor
    cannot open.
  */
  const recent = await db.find<ProgressDoc>(
    "progress",
    { userId, completedAt: null },
    { sort: { updatedAt: -1 }, limit: 10 }
  );

  for (const row of recent) {
    const lesson = await db.findOne<LessonDoc>("lessons", { id: row.lessonId, isPublished: true });
    if (!lesson) continue;

    const category = await db.findOne<CategoryDoc>("categories", { id: lesson.categoryId });
    if (!category) continue;

    const asset = lesson.videoAssetId ? await db.findOne<VideoAssetDoc>("video_assets", { id: lesson.videoAssetId }) : null;
    const lessonCount = await db.countDocuments<LessonDoc>("lessons", { categoryId: category.id, isPublished: true });

    return {
      lessonId: lesson.id,
      lessonTitleHi: lesson.titleHi,
      lessonTitleEn: lesson.titleEn,
      categoryId: category.id,
      categoryNameHi: category.nameHi,
      categoryNameEn: category.nameEn,
      sortOrder: lesson.sortOrder,
      lessonCount,
      watchedSec: row.watchedSec,
      durationSec: asset?.durationSec ?? 0,
    };
  }

  return null;
}

export type CategoryCompletion = { categoryId: string; nameHi: string; nameEn: string; done: number; total: number };

export async function getCategoryCompletion(db: Scoped, userId: string): Promise<CategoryCompletion[]> {
  const completed = await db.find<ProgressDoc>("progress", { userId, completedAt: { $ne: null } });
  if (completed.length === 0) return [];

  const touched = await db.find<LessonDoc>("lessons", { id: { $in: completed.map((p) => p.lessonId) } }, { projection: { id: 1, categoryId: 1 } });
  const categoryIds = [...new Set(touched.map((l) => l.categoryId))];

  const categories = await db.find<CategoryDoc>("categories", { id: { $in: categoryIds } }, { sort: { sortOrder: 1 } });
  const allLessons = await db.find<LessonDoc>(
    "lessons",
    { categoryId: { $in: categories.map((c) => c.id) }, isPublished: true },
    { projection: { id: 1, categoryId: 1 } }
  );

  const lessonToCategory = new Map(allLessons.map((l) => [l.id, l.categoryId]));
  const doneBy = new Map<string, number>();
  for (const p of completed) {
    const categoryId = lessonToCategory.get(p.lessonId);
    if (categoryId) doneBy.set(categoryId, (doneBy.get(categoryId) ?? 0) + 1);
  }

  const totalBy = new Map<string, number>();
  for (const l of allLessons) totalBy.set(l.categoryId, (totalBy.get(l.categoryId) ?? 0) + 1);

  return categories
    .filter((c) => (doneBy.get(c.id) ?? 0) > 0)
    .map((c) => ({
      categoryId: c.id,
      nameHi: c.nameHi,
      nameEn: c.nameEn,
      done: doneBy.get(c.id) ?? 0,
      total: totalBy.get(c.id) ?? 0,
    }));
}

export type BeatResult = { completed: boolean; freeWatched: number; hitFreeLimit: boolean };

/**
 * Records a heartbeat. Returns whether this call completed the lesson and how
 * many free lessons the viewer has now used, so the client knows when to raise
 * the paywall. The client never decides either of those.
 */
export async function recordBeat(
  db: Scoped,
  args: { tenantId: string; userId: string; lessonId: string; positionSec: number; durationSec: number; isFree: boolean; freeLimit: number }
): Promise<BeatResult> {
  const { tenantId, userId, lessonId, isFree, freeLimit } = args;
  // Trust the duration from our own database, not the number the browser sent.
  const durationSec = Math.max(1, args.durationSec);
  const position = Math.min(Math.max(0, Math.floor(args.positionSec)), durationSec);
  const completed = position >= durationSec * COMPLETE_AT;
  const now = new Date();

  /*
    A pipeline update, so "keep the furthest point" and "do not un-complete"
    are evaluated server-side against the stored document. Reading first and
    writing back would let two heartbeats racing each other move progress
    backwards — which is exactly the bug the greatest() in the SQL prevented.
  */
  await db.updateOne<ProgressDoc>(
    "progress",
    { userId, lessonId },
    [
      {
        $set: {
          tenantId,
          userId,
          lessonId,
          watchedSec: { $max: [{ $ifNull: ["$watchedSec", 0] }, position] },
          completedAt: completed ? { $ifNull: ["$completedAt", now] } : { $ifNull: ["$completedAt", null] },
          updatedAt: now,
        },
      },
    ] as never,
    { upsert: true }
  );

  // A free lesson counts against the allowance once, on completion. The unique
  // index on (userId, lessonId) is what makes "once" true under a retry.
  if (completed && isFree) {
    try {
      await db.insertOne<FreeWatchDoc>("free_watch_log", { tenantId, userId, lessonId, completedAt: now });
    } catch {
      // Already logged. Nothing to do.
    }
  }

  const freeWatched = await db.countDocuments<FreeWatchDoc>("free_watch_log", { userId });

  return { completed, freeWatched, hitFreeLimit: freeWatched >= freeLimit };
}

export { HEARTBEAT_SEC };
