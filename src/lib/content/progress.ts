import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { courses, freeWatchLog, lessons, progress, videoAssets } from "@/lib/db/schema";
import type { Tx } from "@/lib/db/tenant";

/*
  Progress.

  The player sends a heartbeat every fifteen seconds while playing. We keep the
  furthest point reached rather than the latest, so scrubbing backwards does not
  erase progress. A lesson counts as complete at ninety percent watched, because
  almost nobody sits through end credits.
*/

export const COMPLETE_AT = 0.9;
const HEARTBEAT_SEC = 15;

export type ProgressRow = { lessonId: string; watchedSec: number; completed: boolean };

export async function getCourseProgress(tx: Tx, userId: string, courseId: string): Promise<Map<string, ProgressRow>> {
  const rows = await tx
    .select({ lessonId: progress.lessonId, watchedSec: progress.watchedSec, completedAt: progress.completedAt })
    .from(progress)
    .innerJoin(lessons, eq(lessons.id, progress.lessonId))
    .where(and(eq(progress.userId, userId), eq(lessons.courseId, courseId)));

  return new Map(rows.map((r) => [r.lessonId, { lessonId: r.lessonId, watchedSec: r.watchedSec, completed: r.completedAt !== null }]));
}

export async function getLessonProgress(tx: Tx, userId: string, lessonId: string): Promise<ProgressRow | null> {
  const [row] = await tx
    .select({ lessonId: progress.lessonId, watchedSec: progress.watchedSec, completedAt: progress.completedAt })
    .from(progress)
    .where(and(eq(progress.userId, userId), eq(progress.lessonId, lessonId)))
    .limit(1);
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
export async function getContinue(tx: Tx, userId: string): Promise<Continue | null> {
  const [row] = await tx
    .select({
      lessonId: lessons.id,
      lessonTitleHi: lessons.titleHi,
      lessonTitleEn: lessons.titleEn,
      courseId: courses.id,
      courseTitleHi: courses.titleHi,
      courseTitleEn: courses.titleEn,
      sortOrder: lessons.sortOrder,
      watchedSec: progress.watchedSec,
      durationSec: sql<number>`coalesce(${videoAssets.durationSec}, 0)`.mapWith(Number),
    })
    .from(progress)
    .innerJoin(lessons, eq(lessons.id, progress.lessonId))
    .innerJoin(courses, and(eq(courses.id, lessons.courseId), eq(courses.isPublished, true)))
    .leftJoin(videoAssets, eq(videoAssets.id, lessons.videoAssetId))
    .where(and(eq(progress.userId, userId), sql`${progress.completedAt} is null`))
    .orderBy(desc(progress.updatedAt))
    .limit(1);

  if (!row) return null;

  const [{ n }] = await tx.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(lessons).where(eq(lessons.courseId, row.courseId));
  return { ...row, lessonCount: n };
}

export type FinishedCourse = { courseId: string; titleHi: string; titleEn: string; done: number; total: number };

export async function getCourseCompletion(tx: Tx, userId: string): Promise<FinishedCourse[]> {
  return tx
    .select({
      courseId: courses.id,
      titleHi: courses.titleHi,
      titleEn: courses.titleEn,
      total: sql<number>`count(${lessons.id})`.mapWith(Number),
      done: sql<number>`count(${progress.completedAt})`.mapWith(Number),
    })
    .from(courses)
    .innerJoin(lessons, eq(lessons.courseId, courses.id))
    .leftJoin(progress, and(eq(progress.lessonId, lessons.id), eq(progress.userId, userId)))
    .where(eq(courses.isPublished, true))
    .groupBy(courses.id)
    .having(sql`count(${progress.completedAt}) > 0`)
    .orderBy(asc(courses.sortOrder));
}

export type BeatResult = { completed: boolean; freeWatched: number; hitFreeLimit: boolean };

/**
 * Records a heartbeat. Returns whether this call completed the lesson and how
 * many free lessons the viewer has now used, so the client knows when to raise
 * the paywall. The client never decides either of those.
 */
export async function recordBeat(
  tx: Tx,
  args: { tenantId: string; userId: string; lessonId: string; positionSec: number; durationSec: number; isFree: boolean; freeLimit: number }
): Promise<BeatResult> {
  const { tenantId, userId, lessonId, isFree, freeLimit } = args;
  // Trust the duration from our own database, not the number the browser sent.
  const durationSec = Math.max(1, args.durationSec);
  const position = Math.min(Math.max(0, Math.floor(args.positionSec)), durationSec);
  const completed = position >= durationSec * COMPLETE_AT;

  await tx
    .insert(progress)
    .values({
      tenantId,
      userId,
      lessonId,
      watchedSec: position,
      completedAt: completed ? new Date() : null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [progress.userId, progress.lessonId],
      set: {
        // Keep the furthest point, so scrubbing back does not lose progress.
        watchedSec: sql`greatest(${progress.watchedSec}, ${position})`,
        completedAt: completed ? sql`coalesce(${progress.completedAt}, now())` : progress.completedAt,
        updatedAt: new Date(),
      },
    });

  // A free lesson counts against the allowance once, on completion.
  if (completed && isFree) {
    await tx.insert(freeWatchLog).values({ tenantId, userId, lessonId }).onConflictDoNothing();
  }

  const [{ n }] = await tx.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(freeWatchLog).where(eq(freeWatchLog.userId, userId));

  return { completed, freeWatched: n, hitFreeLimit: n >= freeLimit };
}

export { HEARTBEAT_SEC };
