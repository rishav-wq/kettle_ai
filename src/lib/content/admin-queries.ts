import type { CategoryDoc, CourseDoc, LessonDoc, VideoAssetDoc } from "@/lib/db/documents";
import type { Scoped } from "@/lib/db/scope";

/*
  The catalogue as the person editing it needs to see it.

  Deliberately not getCatalog(). That one is the learner's view: it hides
  unpublished courses and knows nothing about which lessons have a real video
  behind them. An editor needs exactly the opposite — the drafts, the gaps, and
  the lessons still pointing at a TODO — because those are the things that
  need doing. A single query serving both would end up hiding work from one
  reader or leaking drafts to the other.
*/

export type AdminLesson = {
  id: string;
  courseId: string;
  sortOrder: number;
  titleHi: string;
  titleEn: string;
  isFree: boolean;
  transcriptHi: string | null;
  transcriptEn: string | null;
  provider: string | null;
  providerRef: string | null;
  durationSec: number;
  /** False while the reference is missing or still says TODO. */
  hasVideo: boolean;
};

export type AdminCourse = {
  id: string;
  categoryId: string;
  titleHi: string;
  titleEn: string;
  descriptionHi: string | null;
  descriptionEn: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isPublished: boolean;
  lessons: AdminLesson[];
};

export type AdminCategory = {
  id: string;
  nameHi: string;
  nameEn: string;
  blurbHi: string | null;
  blurbEn: string | null;
  sortOrder: number;
  courses: AdminCourse[];
};

function toLesson(l: LessonDoc, assets: Map<string, VideoAssetDoc>): AdminLesson {
  const asset = l.videoAssetId ? assets.get(l.videoAssetId) : undefined;
  const ref = asset?.providerRef ?? null;
  return {
    id: l.id,
    courseId: l.courseId,
    sortOrder: l.sortOrder,
    titleHi: l.titleHi,
    titleEn: l.titleEn,
    isFree: l.isFree,
    transcriptHi: l.transcriptHi,
    transcriptEn: l.transcriptEn,
    provider: asset?.provider ?? null,
    providerRef: ref,
    durationSec: asset?.durationSec ?? 0,
    hasVideo: Boolean(ref && !ref.startsWith("TODO")),
  };
}

async function loadAll(db: Scoped) {
  const [categories, courses, lessons] = await Promise.all([
    db.find<CategoryDoc>("categories", {}, { sort: { sortOrder: 1 } }),
    db.find<CourseDoc>("courses", {}, { sort: { sortOrder: 1 } }),
    db.find<LessonDoc>("lessons", {}, { sort: { sortOrder: 1 } }),
  ]);

  const assetIds = lessons.map((l) => l.videoAssetId).filter((id): id is string => Boolean(id));
  const assetRows = assetIds.length ? await db.find<VideoAssetDoc>("video_assets", { id: { $in: assetIds } }) : [];
  return { categories, courses, lessons, assets: new Map(assetRows.map((a) => [a.id, a])) };
}

export type AdminCatalog = {
  categories: AdminCategory[];
  totals: { categories: number; courses: number; published: number; lessons: number; withVideo: number; free: number; minutes: number };
};

export async function getAdminCatalog(db: Scoped): Promise<AdminCatalog> {
  const { categories, courses, lessons, assets } = await loadAll(db);

  const byCourse = new Map<string, AdminLesson[]>();
  for (const l of lessons) {
    const row = toLesson(l, assets);
    const list = byCourse.get(l.courseId);
    if (list) list.push(row);
    else byCourse.set(l.courseId, [row]);
  }

  const shaped: AdminCourse[] = courses.map((c) => ({
    id: c.id,
    categoryId: c.categoryId,
    titleHi: c.titleHi,
    titleEn: c.titleEn,
    descriptionHi: c.descriptionHi,
    descriptionEn: c.descriptionEn,
    imageUrl: c.imageUrl,
    sortOrder: c.sortOrder,
    isPublished: c.isPublished,
    lessons: (byCourse.get(c.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }));

  const all = shaped.flatMap((c) => c.lessons);
  const seconds = all.filter((l) => l.hasVideo).reduce((n, l) => n + l.durationSec, 0);

  return {
    categories: categories.map((c) => ({
      id: c.id,
      nameHi: c.nameHi,
      nameEn: c.nameEn,
      blurbHi: c.blurbHi ?? null,
      blurbEn: c.blurbEn ?? null,
      sortOrder: c.sortOrder,
      courses: shaped.filter((s) => s.categoryId === c.id),
    })),
    totals: {
      categories: categories.length,
      courses: shaped.length,
      published: shaped.filter((c) => c.isPublished).length,
      lessons: all.length,
      withVideo: all.filter((l) => l.hasVideo).length,
      free: all.filter((l) => l.isFree).length,
      minutes: Math.round(seconds / 60),
    },
  };
}

/** One course, for its own editing screen. Null when the slug is not a course. */
export async function getAdminCourse(db: Scoped, courseId: string): Promise<{ course: AdminCourse; categories: CategoryDoc[] } | null> {
  const course = await db.findOne<CourseDoc>("courses", { id: courseId });
  if (!course) return null;

  const lessons = await db.find<LessonDoc>("lessons", { courseId }, { sort: { sortOrder: 1 } });
  const assetIds = lessons.map((l) => l.videoAssetId).filter((id): id is string => Boolean(id));
  const assetRows = assetIds.length ? await db.find<VideoAssetDoc>("video_assets", { id: { $in: assetIds } }) : [];
  const assets = new Map(assetRows.map((a) => [a.id, a]));

  const categories = await db.find<CategoryDoc>("categories", {}, { sort: { sortOrder: 1 } });

  return {
    course: {
      id: course.id,
      categoryId: course.categoryId,
      titleHi: course.titleHi,
      titleEn: course.titleEn,
      descriptionHi: course.descriptionHi,
      descriptionEn: course.descriptionEn,
      imageUrl: course.imageUrl,
      sortOrder: course.sortOrder,
      isPublished: course.isPublished,
      lessons: lessons.map((l) => toLesson(l, assets)),
    },
    categories,
  };
}

/** How many lessons are free right now, across everything. The editor shows this constantly. */
export async function countFreeLessons(db: Scoped): Promise<number> {
  return db.countDocuments<LessonDoc>("lessons", { isFree: true });
}
