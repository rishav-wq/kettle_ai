import "server-only";
import type { CourseDoc, FreeWatchDoc, LessonDoc, ProgressDoc, VideoAssetDoc } from "@/lib/db/documents";
import type { Scoped } from "@/lib/db/scope";

/*
  Progress.

  The player sends a heartbeat every fifteen seconds while playing. We keep the
  furthest point reached rather than the latest, so scrubbing backwards does not
  erase progress. A lesson counts as complete at ninety percent watched, because
  almost nobody sits through end credits.

  Where Postgres did this with joins, MongoDB does it with a second lookup and
  a join in memory. The catalogue is sixteen courses and sixty-seven lessons —
  small enough that two round trips beat an aggregation pipeline nobody can
  read six months from now.
*/

export const COMPLETE_AT = 0.9;
const HEARTBEAT_SEC = 15;

export type ProgressRow = { lessonId: string; watchedSec: number; completed: boolean };

export async function getCourseProgress(db: Scoped, userId: string, courseId: string): Promise<Map<string, ProgressRow>> {
  const lessons = await db.find<LessonDoc>("lessons", { courseId }, { projection: { id: 1 } });
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
  courseId: string;
  courseTitleHi: string;
  courseTitleEn: string;
  sortOrder: number;
  lessonCount: number;
  watchedSec: number;
  durationSec: number;
};

/** The single most recently touched unfinished lesson. Powers "pick up where you left". */
export async function getContinue(db: Scoped, userId: string): Promise<Continue | null> {
  /*
    Walk back through recent unfinished progress rather than taking only the
    newest. The newest might belong to a lesson whose course was unpublished,
    which in SQL the INNER JOIN silently skipped; here it has to be skipped
    deliberately or the card would point at something a visitor cannot open.
  */
  const recent = await db.find<ProgressDoc>(
    "progress",
    { userId, completedAt: null },
    { sort: { updatedAt: -1 }, limit: 10 }
  );

  for (const row of recent) {
    const lesson = await db.findOne<LessonDoc>("lessons", { id: row.lessonId });
    if (!lesson) continue;

    const course = await db.findOne<CourseDoc>("courses", { id: lesson.courseId, isPublished: true });
    if (!course) continue;

    const asset = lesson.videoAssetId ? await db.findOne<VideoAssetDoc>("video_assets", { id: lesson.videoAssetId }) : null;
    const lessonCount = await db.countDocuments<LessonDoc>("lessons", { courseId: course.id });

    return {
      lessonId: lesson.id,
      lessonTitleHi: lesson.titleHi,
      lessonTitleEn: lesson.titleEn,
      courseId: course.id,
      courseTitleHi: course.titleHi,
      courseTitleEn: course.titleEn,
      sortOrder: lesson.sortOrder,
      lessonCount,
      watchedSec: row.watchedSec,
      durationSec: asset?.durationSec ?? 0,
    };
  }

  return null;
}

export type FinishedCourse = { courseId: string; titleHi: string; titleEn: string; done: number; total: number };

export async function getCourseCompletion(db: Scoped, userId: string): Promise<FinishedCourse[]> {
  const completed = await db.find<ProgressDoc>("progress", { userId, completedAt: { $ne: null } });
  if (completed.length === 0) return [];

  const lessons = await db.find<LessonDoc>("lessons", { id: { $in: completed.map((p) => p.lessonId) } });
  const courseIds = [...new Set(lessons.map((l) => l.courseId))];

  const courses = await db.find<CourseDoc>("courses", { id: { $in: courseIds }, isPublished: true }, { sort: { sortOrder: 1 } });
  const allLessons = await db.find<LessonDoc>("lessons", { courseId: { $in: courses.map((c) => c.id) } }, { projection: { id: 1, courseId: 1 } });

  const doneByCourse = new Map<string, number>();
  const lessonToCourse = new Map(allLessons.map((l) => [l.id, l.courseId]));
  for (const p of completed) {
    const courseId = lessonToCourse.get(p.lessonId);
    if (courseId) doneByCourse.set(courseId, (doneByCourse.get(courseId) ?? 0) + 1);
  }

  const totalByCourse = new Map<string, number>();
  for (const l of allLessons) totalByCourse.set(l.courseId, (totalByCourse.get(l.courseId) ?? 0) + 1);

  return courses
    .filter((c) => (doneByCourse.get(c.id) ?? 0) > 0)
    .map((c) => ({
      courseId: c.id,
      titleHi: c.titleHi,
      titleEn: c.titleEn,
      done: doneByCourse.get(c.id) ?? 0,
      total: totalByCourse.get(c.id) ?? 0,
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
