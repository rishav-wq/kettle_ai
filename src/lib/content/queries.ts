import type { CategoryDoc, CourseDoc, LessonDoc, MembershipDoc, VideoAssetDoc } from "@/lib/db/documents";
import type { Scoped } from "@/lib/db/scope";

/*
  Read side of the catalogue.

  Every function takes the scoped handle, so a private course belonging to
  another tenant is filtered out before it is ever considered — the same
  guarantee the RLS policy on courses used to give, now applied by
  src/lib/db/scope.ts.

  Where Postgres grouped and joined, this loads the few documents involved and
  joins them in memory. Sixteen courses and sixty-seven lessons is small enough
  that two or three round trips are faster than an aggregation pipeline, and
  very much easier to read later.
*/

/** A lesson is only watchable once its video reference is real. */
function isPlayable(asset: VideoAssetDoc | undefined): boolean {
  return Boolean(asset && asset.providerRef && !asset.providerRef.startsWith("TODO"));
}

/** Loads published courses, their lessons, and the video assets behind them. */
async function loadCatalogue(db: Scoped) {
  const courses = await db.find<CourseDoc>("courses", { isPublished: true }, { sort: { sortOrder: 1 } });
  const lessons = courses.length
    ? await db.find<LessonDoc>("lessons", { courseId: { $in: courses.map((c) => c.id) } }, { sort: { sortOrder: 1 } })
    : [];

  const assetIds = lessons.map((l) => l.videoAssetId).filter((id): id is string => Boolean(id));
  const assets = assetIds.length ? await db.find<VideoAssetDoc>("video_assets", { id: { $in: assetIds } }) : [];
  const assetById = new Map(assets.map((a) => [a.id, a]));

  return { courses, lessons, assetById };
}

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
  blurbHi: string | null;
  blurbEn: string | null;
  courses: CourseSummary[];
};

export async function getCatalog(db: Scoped): Promise<CategoryWithCourses[]> {
  const cats = await db.find<CategoryDoc>("categories", {}, { sort: { sortOrder: 1 } });
  const { courses, lessons, assetById } = await loadCatalogue(db);

  const byCourse = new Map<string, LessonDoc[]>();
  for (const l of lessons) {
    const list = byCourse.get(l.courseId);
    if (list) list.push(l);
    else byCourse.set(l.courseId, [l]);
  }

  const summaries: CourseSummary[] = courses.map((c) => {
    const own = byCourse.get(c.id) ?? [];
    const seconds = own.reduce((n, l) => n + (l.videoAssetId ? (assetById.get(l.videoAssetId)?.durationSec ?? 0) : 0), 0);
    return {
      id: c.id,
      categoryId: c.categoryId,
      titleHi: c.titleHi,
      titleEn: c.titleEn,
      imageUrl: c.imageUrl,
      lessonCount: own.length,
      minutes: Math.round(seconds / 60),
      hasFree: own.some((l) => l.isFree),
    };
  });

  /*
    Empty categories are kept, not dropped.

    A category with nothing in it yet still says what this product is going to
    be, and which of them get tapped is the cheapest signal there is about what
    to film next. Filtering them out showed a thinner catalogue than the one
    being built. The Learn page renders them as "coming soon".
  */
  return cats.map((c) => ({
    id: c.id,
    nameHi: c.nameHi,
    nameEn: c.nameEn,
    blurbHi: c.blurbHi ?? null,
    blurbEn: c.blurbEn ?? null,
    courses: summaries.filter((s) => s.categoryId === c.id),
  }));
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

export async function getCourse(db: Scoped, courseId: string): Promise<CourseDetail | null> {
  const course = await db.findOne<CourseDoc>("courses", { id: courseId, isPublished: true });
  if (!course) return null;

  const category = await db.findOne<CategoryDoc>("categories", { id: course.categoryId });
  if (!category) return null;

  const lessons = await db.find<LessonDoc>("lessons", { courseId }, { sort: { sortOrder: 1 } });
  const assetIds = lessons.map((l) => l.videoAssetId).filter((id): id is string => Boolean(id));
  const assets = assetIds.length ? await db.find<VideoAssetDoc>("video_assets", { id: { $in: assetIds } }) : [];
  const assetById = new Map(assets.map((a) => [a.id, a]));

  return {
    id: course.id,
    titleHi: course.titleHi,
    titleEn: course.titleEn,
    descriptionHi: course.descriptionHi,
    descriptionEn: course.descriptionEn,
    categoryNameHi: category.nameHi,
    categoryNameEn: category.nameEn,
    lessons: lessons.map((l) => ({
      id: l.id,
      sortOrder: l.sortOrder,
      titleHi: l.titleHi,
      titleEn: l.titleEn,
      isFree: l.isFree,
      durationSec: l.videoAssetId ? (assetById.get(l.videoAssetId)?.durationSec ?? 0) : 0,
    })),
  };
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

export async function getLesson(db: Scoped, lessonId: string): Promise<LessonDetail | null> {
  const lesson = await db.findOne<LessonDoc>("lessons", { id: lessonId });
  if (!lesson) return null;

  // The course must be published, and must be one this tenant can see. The
  // scoped handle decides the second part; this decides the first.
  const course = await db.findOne<CourseDoc>("courses", { id: lesson.courseId, isPublished: true });
  if (!course) return null;

  const asset = lesson.videoAssetId ? await db.findOne<VideoAssetDoc>("video_assets", { id: lesson.videoAssetId }) : null;
  const siblings = await db.find<LessonDoc>("lessons", { courseId: course.id }, { sort: { sortOrder: 1 } });
  const next = siblings.find((s) => s.sortOrder > lesson.sortOrder) ?? null;

  return {
    id: lesson.id,
    sortOrder: lesson.sortOrder,
    titleHi: lesson.titleHi,
    titleEn: lesson.titleEn,
    isFree: lesson.isFree,
    transcriptHi: lesson.transcriptHi,
    transcriptEn: lesson.transcriptEn,
    video: asset ? { provider: asset.provider, providerRef: asset.providerRef, durationSec: asset.durationSec } : null,
    course: { id: course.id, titleHi: course.titleHi, titleEn: course.titleEn, lessonCount: siblings.length },
    next: next ? { id: next.id, titleHi: next.titleHi } : null,
  };
}

/** The four free lessons, for the landing page. */
export async function getFreeLessons(db: Scoped) {
  const { courses, lessons, assetById } = await loadCatalogue(db);
  const order = new Map(courses.map((c, i) => [c.id, i]));
  const courseById = new Map(courses.map((c) => [c.id, c]));

  return lessons
    .filter((l) => l.isFree && courseById.has(l.courseId))
    .sort((a, b) => (order.get(a.courseId)! - order.get(b.courseId)!) || a.sortOrder - b.sortOrder)
    .slice(0, 4)
    .map((l) => ({
      id: l.id,
      titleHi: l.titleHi,
      titleEn: l.titleEn,
      courseId: l.courseId,
      courseTitleHi: courseById.get(l.courseId)!.titleHi,
      courseTitleEn: courseById.get(l.courseId)!.titleEn,
      durationSec: l.videoAssetId ? (assetById.get(l.videoAssetId)?.durationSec ?? 0) : 0,
    }));
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
export async function getCatalogStats(db: Scoped): Promise<CatalogStats> {
  const { courses, lessons, assetById } = await loadCatalogue(db);

  const playable = lessons.filter((l) => isPlayable(l.videoAssetId ? assetById.get(l.videoAssetId) : undefined));
  const seconds = playable.reduce((n, l) => n + (assetById.get(l.videoAssetId!)?.durationSec ?? 0), 0);
  const withVideo = new Set(playable.map((l) => l.courseId));

  const learners = await db.countDocuments<MembershipDoc>("memberships", {
    status: "active",
    validUntil: { $gt: new Date() },
  });

  return {
    courses: courses.filter((c) => withVideo.has(c.id)).length,
    lessons: playable.length,
    minutes: Math.round(seconds / 60),
    freeLessons: playable.filter((l) => l.isFree).length,
    learners,
  };
}
