import { and, asc, count, eq, gt, sql } from "drizzle-orm";
import { categories, courses, lessons, memberships, videoAssets } from "@/lib/db/schema";
import type { Tx } from "@/lib/db/tenant";

/*
  Read side of the catalog. Every function takes the tenant transaction, so the
  RLS policy on courses hides another tenant's private courses automatically.
*/

export type CourseSummary = {
  id: string;
  categoryId: string;
  titleHi: string;
  titleEn: string;
  imageUrl: string | null;
  lessonCount: number;
  minutes: number;
  hasFree: boolean;
};

export type CategoryWithCourses = {
  id: string;
  nameHi: string;
  nameEn: string;
  courses: CourseSummary[];
};

export async function getCatalog(tx: Tx): Promise<CategoryWithCourses[]> {
  const cats = await tx.select().from(categories).orderBy(asc(categories.sortOrder));

  const rows = await tx
    .select({
      id: courses.id,
      categoryId: courses.categoryId,
      titleHi: courses.titleHi,
      titleEn: courses.titleEn,
      imageUrl: courses.imageUrl,
      sortOrder: courses.sortOrder,
      lessonCount: count(lessons.id),
      seconds: sql<number>`coalesce(sum(${videoAssets.durationSec}), 0)`.mapWith(Number),
      freeCount: sql<number>`coalesce(sum(case when ${lessons.isFree} then 1 else 0 end), 0)`.mapWith(Number),
    })
    .from(courses)
    .leftJoin(lessons, eq(lessons.courseId, courses.id))
    .leftJoin(videoAssets, eq(lessons.videoAssetId, videoAssets.id))
    .where(eq(courses.isPublished, true))
    .groupBy(courses.id)
    .orderBy(asc(courses.sortOrder));

  return cats
    .map((c) => ({
      id: c.id,
      nameHi: c.nameHi,
      nameEn: c.nameEn,
      courses: rows
        .filter((r) => r.categoryId === c.id)
        .map((r) => ({
          id: r.id,
          categoryId: r.categoryId,
          titleHi: r.titleHi,
          titleEn: r.titleEn,
          imageUrl: r.imageUrl,
          lessonCount: r.lessonCount,
          minutes: Math.round(r.seconds / 60),
          hasFree: r.freeCount > 0,
        })),
    }))
    .filter((c) => c.courses.length > 0);
}

export type LessonRowData = {
  id: string;
  sortOrder: number;
  titleHi: string;
  titleEn: string;
  isFree: boolean;
  durationSec: number;
};

export type CourseDetail = {
  id: string;
  titleHi: string;
  titleEn: string;
  descriptionHi: string | null;
  descriptionEn: string | null;
  categoryNameHi: string;
  categoryNameEn: string;
  lessons: LessonRowData[];
};

export async function getCourse(tx: Tx, courseId: string): Promise<CourseDetail | null> {
  const [course] = await tx
    .select({
      id: courses.id,
      titleHi: courses.titleHi,
      titleEn: courses.titleEn,
      descriptionHi: courses.descriptionHi,
      descriptionEn: courses.descriptionEn,
      categoryNameHi: categories.nameHi,
      categoryNameEn: categories.nameEn,
    })
    .from(courses)
    .innerJoin(categories, eq(categories.id, courses.categoryId))
    .where(and(eq(courses.id, courseId), eq(courses.isPublished, true)))
    .limit(1);
  if (!course) return null;

  const rows = await tx
    .select({
      id: lessons.id,
      sortOrder: lessons.sortOrder,
      titleHi: lessons.titleHi,
      titleEn: lessons.titleEn,
      isFree: lessons.isFree,
      durationSec: sql<number>`coalesce(${videoAssets.durationSec}, 0)`.mapWith(Number),
    })
    .from(lessons)
    .leftJoin(videoAssets, eq(lessons.videoAssetId, videoAssets.id))
    .where(eq(lessons.courseId, courseId))
    .orderBy(asc(lessons.sortOrder));

  return { ...course, lessons: rows };
}

export type LessonDetail = {
  id: string;
  sortOrder: number;
  titleHi: string;
  titleEn: string;
  isFree: boolean;
  transcriptHi: string | null;
  transcriptEn: string | null;
  video: { provider: "youtube" | "bunny" | "cloudflare"; providerRef: string; durationSec: number } | null;
  course: { id: string; titleHi: string; titleEn: string; lessonCount: number };
  next: { id: string; titleHi: string } | null;
};

export async function getLesson(tx: Tx, lessonId: string): Promise<LessonDetail | null> {
  const [row] = await tx
    .select({
      id: lessons.id,
      sortOrder: lessons.sortOrder,
      titleHi: lessons.titleHi,
      titleEn: lessons.titleEn,
      isFree: lessons.isFree,
      transcriptHi: lessons.transcriptHi,
      transcriptEn: lessons.transcriptEn,
      provider: videoAssets.provider,
      providerRef: videoAssets.providerRef,
      durationSec: videoAssets.durationSec,
      courseId: courses.id,
      courseTitleHi: courses.titleHi,
      courseTitleEn: courses.titleEn,
    })
    .from(lessons)
    .innerJoin(courses, and(eq(courses.id, lessons.courseId), eq(courses.isPublished, true)))
    .leftJoin(videoAssets, eq(lessons.videoAssetId, videoAssets.id))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  if (!row) return null;

  const siblings = await tx
    .select({ id: lessons.id, titleHi: lessons.titleHi, sortOrder: lessons.sortOrder })
    .from(lessons)
    .where(eq(lessons.courseId, row.courseId))
    .orderBy(asc(lessons.sortOrder));

  const next = siblings.find((s) => s.sortOrder > row.sortOrder) ?? null;

  return {
    id: row.id,
    sortOrder: row.sortOrder,
    titleHi: row.titleHi,
    titleEn: row.titleEn,
    isFree: row.isFree,
    transcriptHi: row.transcriptHi,
    transcriptEn: row.transcriptEn,
    video: row.provider && row.providerRef ? { provider: row.provider, providerRef: row.providerRef, durationSec: row.durationSec ?? 0 } : null,
    course: { id: row.courseId, titleHi: row.courseTitleHi, titleEn: row.courseTitleEn, lessonCount: siblings.length },
    next: next ? { id: next.id, titleHi: next.titleHi } : null,
  };
}

/** The four free lessons, for the landing page. */
export async function getFreeLessons(tx: Tx) {
  return tx
    .select({
      id: lessons.id,
      titleHi: lessons.titleHi,
      titleEn: lessons.titleEn,
      courseId: courses.id,
      courseTitleEn: courses.titleEn,
      durationSec: sql<number>`coalesce(${videoAssets.durationSec}, 0)`.mapWith(Number),
    })
    .from(lessons)
    .innerJoin(courses, and(eq(courses.id, lessons.courseId), eq(courses.isPublished, true)))
    .leftJoin(videoAssets, eq(lessons.videoAssetId, videoAssets.id))
    .where(eq(lessons.isFree, true))
    .orderBy(asc(courses.sortOrder), asc(lessons.sortOrder))
    .limit(4);
}

export type CatalogStats = {
  courses: number;
  lessons: number;
  minutes: number;
  freeLessons: number;
  /** Real active memberships. Zero until someone actually pays. */
  learners: number;
};

/**
 * The numbers for the landing page proof strip.
 *
 * Every one is counted from the database, and counted from what a visitor can
 * actually watch. A lesson whose video reference still starts with TODO exists
 * in the catalogue but plays nothing, so counting it inflated the strip to
 * "67 lessons, 395 minutes" when two lessons had video between them. That is
 * the same rule the learner count already follows: state it only if it is
 * real, and otherwise do not state it.
 *
 * These numbers climb on their own as videos are linked. Nothing needs editing.
 */
export async function getCatalogStats(tx: Tx): Promise<CatalogStats> {
  /* A lesson counts once it has a video that would actually play. Mirrors the
     TODO check in src/lib/video/embed.ts, which is what renders the
     "video being added" placeholder. */
  const playable = sql`${videoAssets.providerRef} is not null and ${videoAssets.providerRef} not like 'TODO%'`;

  const [row] = await tx
    .select({
      courses: sql<number>`count(distinct case when ${playable} then ${courses.id} end)`.mapWith(Number),
      lessons: sql<number>`coalesce(sum(case when ${playable} then 1 else 0 end), 0)`.mapWith(Number),
      seconds: sql<number>`coalesce(sum(case when ${playable} then ${videoAssets.durationSec} else 0 end), 0)`.mapWith(Number),
      freeLessons: sql<number>`coalesce(sum(case when ${playable} and ${lessons.isFree} then 1 else 0 end), 0)`.mapWith(Number),
    })
    .from(courses)
    .leftJoin(lessons, eq(lessons.courseId, courses.id))
    .leftJoin(videoAssets, eq(videoAssets.id, lessons.videoAssetId))
    .where(eq(courses.isPublished, true));

  const [m] = await tx
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(memberships)
    .where(and(eq(memberships.status, "active"), gt(memberships.validUntil, new Date())));

  return {
    courses: row?.courses ?? 0,
    lessons: row?.lessons ?? 0,
    minutes: Math.round((row?.seconds ?? 0) / 60),
    freeLessons: row?.freeLessons ?? 0,
    learners: m?.n ?? 0,
  };
}
