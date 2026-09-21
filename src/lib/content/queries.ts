import type { CategoryDoc, LessonDoc, MembershipDoc, VideoAssetDoc } from "@/lib/db/documents";
import type { Scoped } from "@/lib/db/scope";
import { youtubeThumbnail } from "@/lib/video/embed";

/*
  Read side of the catalogue.

  Every function takes the scoped handle, so a private category belonging to
  another tenant is filtered out before it is ever considered — the same
  guarantee the RLS policy used to give, now applied by src/lib/db/scope.ts.

  Two levels: a category, then its lessons. Courses used to sit between them
  and were removed; see the note on CategoryDoc in src/lib/db/documents.ts.

  Where Postgres grouped and joined, this loads the few documents involved and
  joins them in memory. Sixty-seven lessons is small enough that two or three
  round trips are faster than an aggregation pipeline, and very much easier to
  read later.
*/

/** A lesson is only watchable once its video reference is real. */
function isPlayable(asset: VideoAssetDoc | undefined): boolean {
  return Boolean(asset && asset.providerRef && !asset.providerRef.startsWith("TODO"));
}

export type LessonSummary = {
  id: string;
  categoryId: string;
  sortOrder: number;
  titleHi: string;
  titleEn: string;
  /** The video's own thumbnail where there is one, the override otherwise. */
  imageUrl: string | null;
  minutes: number;
  isFree: boolean;
  /** False while the reference is missing or still says TODO. */
  hasVideo: boolean;
};

export type CategoryWithLessons = {
  id: string;
  nameHi: string;
  nameEn: string;
  blurbHi: string | null;
  blurbEn: string | null;
  descriptionHi: string | null;
  descriptionEn: string | null;
  lessons: LessonSummary[];
};

/**
 * Published lessons and the video assets behind them.
 *
 * `isPublished` is the lesson's own now. It used to belong to the course, so
 * unpublishing meant hiding a whole group; a lesson written before its video
 * exists is the thing that actually needs hiding.
 */
async function loadLessons(db: Scoped) {
  const lessons = await db.find<LessonDoc>("lessons", { isPublished: true }, { sort: { sortOrder: 1 } });

  const assetIds = lessons.map((l) => l.videoAssetId).filter((id): id is string => Boolean(id));
  const assets = assetIds.length ? await db.find<VideoAssetDoc>("video_assets", { id: { $in: assetIds } }) : [];
  return { lessons, assetById: new Map(assets.map((a) => [a.id, a])) };
}

function toSummary(l: LessonDoc, assetById: Map<string, VideoAssetDoc>): LessonSummary {
  const asset = l.videoAssetId ? assetById.get(l.videoAssetId) : undefined;
  const playable = isPlayable(asset);
  return {
    id: l.id,
    categoryId: l.categoryId,
    sortOrder: l.sortOrder,
    titleHi: l.titleHi,
    titleEn: l.titleEn,
    /*
      A frame of the lesson itself beats stock illustration, and it is free —
      YouTube serves a thumbnail for every video. imageUrl is the override, and
      what a lesson still waiting for its video falls back to.
    */
    imageUrl: (playable ? youtubeThumbnail(asset!.provider, asset!.providerRef) : null) ?? l.imageUrl,
    minutes: Math.max(1, Math.round((asset?.durationSec ?? 0) / 60)),
    isFree: l.isFree,
    hasVideo: playable,
  };
}

export async function getCatalog(db: Scoped): Promise<CategoryWithLessons[]> {
  const cats = await db.find<CategoryDoc>("categories", {}, { sort: { sortOrder: 1 } });
  const { lessons, assetById } = await loadLessons(db);

  /*
    Empty categories are kept, not dropped.

    A category with nothing in it yet still says what this product is going to
    be, and which of them get tapped is the cheapest signal there is about what
    to film next. The Learn page renders them as "coming soon".
  */
  return cats.map((c) => ({
    id: c.id,
    nameHi: c.nameHi,
    nameEn: c.nameEn,
    blurbHi: c.blurbHi ?? null,
    blurbEn: c.blurbEn ?? null,
    descriptionHi: c.descriptionHi ?? null,
    descriptionEn: c.descriptionEn ?? null,
    lessons: lessons.filter((l) => l.categoryId === c.id).map((l) => toSummary(l, assetById)),
  }));
}

/** One category and everything in it, for its own page. Null when the slug is not one. */
export async function getCategory(db: Scoped, categoryId: string): Promise<CategoryWithLessons | null> {
  const c = await db.findOne<CategoryDoc>("categories", { id: categoryId });
  if (!c) return null;

  const lessons = await db.find<LessonDoc>("lessons", { categoryId, isPublished: true }, { sort: { sortOrder: 1 } });
  const assetIds = lessons.map((l) => l.videoAssetId).filter((id): id is string => Boolean(id));
  const assets = assetIds.length ? await db.find<VideoAssetDoc>("video_assets", { id: { $in: assetIds } }) : [];
  const assetById = new Map(assets.map((a) => [a.id, a]));

  return {
    id: c.id,
    nameHi: c.nameHi,
    nameEn: c.nameEn,
    blurbHi: c.blurbHi ?? null,
    blurbEn: c.blurbEn ?? null,
    descriptionHi: c.descriptionHi ?? null,
    descriptionEn: c.descriptionEn ?? null,
    lessons: lessons.map((l) => toSummary(l, assetById)),
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
  video: {
    provider: "youtube" | "bunny" | "cloudflare";
    providerRef: string;
    durationSec: number;
    orientation: "landscape" | "portrait";
  } | null;
  category: { id: string; nameHi: string; nameEn: string; lessonCount: number };
  next: { id: string; titleHi: string; titleEn: string } | null;
};

export async function getLesson(db: Scoped, lessonId: string): Promise<LessonDetail | null> {
  const lesson = await db.findOne<LessonDoc>("lessons", { id: lessonId, isPublished: true });
  if (!lesson) return null;

  // The category must be one this tenant can see; the scoped handle decides that.
  const category = await db.findOne<CategoryDoc>("categories", { id: lesson.categoryId });
  if (!category) return null;

  const asset = lesson.videoAssetId ? await db.findOne<VideoAssetDoc>("video_assets", { id: lesson.videoAssetId }) : null;
  const siblings = await db.find<LessonDoc>("lessons", { categoryId: category.id, isPublished: true }, { sort: { sortOrder: 1 } });
  const next = siblings.find((s) => s.sortOrder > lesson.sortOrder) ?? null;

  return {
    id: lesson.id,
    sortOrder: lesson.sortOrder,
    titleHi: lesson.titleHi,
    titleEn: lesson.titleEn,
    isFree: lesson.isFree,
    transcriptHi: lesson.transcriptHi,
    transcriptEn: lesson.transcriptEn,
    video: asset
      ? {
          provider: asset.provider,
          providerRef: asset.providerRef,
          durationSec: asset.durationSec,
          orientation: asset.orientation ?? "landscape",
        }
      : null,
    category: { id: category.id, nameHi: category.nameHi, nameEn: category.nameEn, lessonCount: siblings.length },
    next: next ? { id: next.id, titleHi: next.titleHi, titleEn: next.titleEn } : null,
  };
}

/** The four free lessons, for the landing page. */
export async function getFreeLessons(db: Scoped) {
  const { lessons, assetById } = await loadLessons(db);
  const cats = await db.find<CategoryDoc>("categories", {}, { sort: { sortOrder: 1 } });
  const order = new Map(cats.map((c, i) => [c.id, i]));
  const catById = new Map(cats.map((c) => [c.id, c]));

  return lessons
    .filter((l) => l.isFree && catById.has(l.categoryId))
    .sort((a, b) => (order.get(a.categoryId)! - order.get(b.categoryId)!) || a.sortOrder - b.sortOrder)
    .slice(0, 4)
    .map((l) => {
      const asset = l.videoAssetId ? assetById.get(l.videoAssetId) : undefined;
      const cat = catById.get(l.categoryId)!;
      return {
        id: l.id,
        titleHi: l.titleHi,
        titleEn: l.titleEn,
        categoryId: l.categoryId,
        categoryNameHi: cat.nameHi,
        categoryNameEn: cat.nameEn,
        durationSec: asset?.durationSec ?? 0,
      };
    });
}

export type CatalogStats = {
  categories: number;
  lessons: number;
  minutes: number;
  freeLessons: number;
  /** Real active memberships. Zero until someone actually pays. */
  learners: number;
};

/**
 * The numbers for the landing page proof strip.
 *
 * Every one is counted from what a visitor can actually watch. A lesson whose
 * video reference still starts with TODO exists in the catalogue but plays
 * nothing, so counting it inflated the strip to "67 lessons, 395 minutes" when
 * two lessons had video between them.
 *
 * These numbers climb on their own as videos are linked. Nothing needs editing.
 */
export async function getCatalogStats(db: Scoped): Promise<CatalogStats> {
  const { lessons, assetById } = await loadLessons(db);

  const playable = lessons.filter((l) => isPlayable(l.videoAssetId ? assetById.get(l.videoAssetId) : undefined));
  const seconds = playable.reduce((n, l) => n + (assetById.get(l.videoAssetId!)?.durationSec ?? 0), 0);
  const withVideo = new Set(playable.map((l) => l.categoryId));

  const learners = await db.countDocuments<MembershipDoc>("memberships", {
    status: "active",
    validUntil: { $gt: new Date() },
  });

  return {
    categories: withVideo.size,
    lessons: playable.length,
    minutes: Math.round(seconds / 60),
    freeLessons: playable.filter((l) => l.isFree).length,
    learners,
  };
}
