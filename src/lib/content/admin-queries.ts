import type { CategoryDoc, LessonDoc, VideoAssetDoc } from "@/lib/db/documents";
import type { Scoped } from "@/lib/db/scope";

/*
  The catalogue as the person editing it needs to see it.

  Deliberately not getCatalog(). That one is the learner's view: it hides
  unpublished lessons and knows nothing about which ones still point at a
  TODO. An editor needs exactly the opposite — the drafts and the gaps —
  because those are the things that need doing. A single query serving both
  ends up hiding work from one reader or leaking drafts to the other.
*/

export type AdminLesson = {
  id: string;
  categoryId: string;
  sortOrder: number;
  titleHi: string;
  titleEn: string;
  isFree: boolean;
  isPublished: boolean;
  transcriptHi: string | null;
  transcriptEn: string | null;
  imageUrl: string | null;
  provider: string | null;
  providerRef: string | null;
  durationSec: number;
  orientation: "landscape" | "portrait";
  /** False while the reference is missing or still says TODO. */
  hasVideo: boolean;
};

export type AdminCategory = {
  id: string;
  nameHi: string;
  nameEn: string;
  blurbHi: string | null;
  blurbEn: string | null;
  descriptionHi: string | null;
  descriptionEn: string | null;
  sortOrder: number;
  lessons: AdminLesson[];
};

function toLesson(l: LessonDoc, assets: Map<string, VideoAssetDoc>): AdminLesson {
  const asset = l.videoAssetId ? assets.get(l.videoAssetId) : undefined;
  const ref = asset?.providerRef ?? null;
  return {
    id: l.id,
    categoryId: l.categoryId,
    sortOrder: l.sortOrder,
    titleHi: l.titleHi,
    titleEn: l.titleEn,
    isFree: l.isFree,
    isPublished: l.isPublished,
    transcriptHi: l.transcriptHi,
    transcriptEn: l.transcriptEn,
    imageUrl: l.imageUrl,
    provider: asset?.provider ?? null,
    providerRef: ref,
    durationSec: asset?.durationSec ?? 0,
    orientation: asset?.orientation ?? "landscape",
    hasVideo: Boolean(ref && !ref.startsWith("TODO")),
  };
}

function shape(c: CategoryDoc, lessons: AdminLesson[]): AdminCategory {
  return {
    id: c.id,
    nameHi: c.nameHi,
    nameEn: c.nameEn,
    blurbHi: c.blurbHi ?? null,
    blurbEn: c.blurbEn ?? null,
    descriptionHi: c.descriptionHi ?? null,
    descriptionEn: c.descriptionEn ?? null,
    sortOrder: c.sortOrder,
    lessons,
  };
}

export type AdminCatalog = {
  categories: AdminCategory[];
  totals: { categories: number; lessons: number; published: number; withVideo: number; free: number; minutes: number };
};

export async function getAdminCatalog(db: Scoped): Promise<AdminCatalog> {
  const [categories, lessons] = await Promise.all([
    db.find<CategoryDoc>("categories", {}, { sort: { sortOrder: 1 } }),
    db.find<LessonDoc>("lessons", {}, { sort: { sortOrder: 1 } }),
  ]);

  const assetIds = lessons.map((l) => l.videoAssetId).filter((id): id is string => Boolean(id));
  const assetRows = assetIds.length ? await db.find<VideoAssetDoc>("video_assets", { id: { $in: assetIds } }) : [];
  const assets = new Map(assetRows.map((a) => [a.id, a]));

  const rows = lessons.map((l) => toLesson(l, assets));
  const seconds = rows.filter((l) => l.hasVideo).reduce((n, l) => n + l.durationSec, 0);

  return {
    categories: categories.map((c) =>
      shape(
        c,
        rows.filter((l) => l.categoryId === c.id).sort((a, b) => a.sortOrder - b.sortOrder)
      )
    ),
    totals: {
      categories: categories.length,
      lessons: rows.length,
      published: rows.filter((l) => l.isPublished).length,
      withVideo: rows.filter((l) => l.hasVideo).length,
      free: rows.filter((l) => l.isFree).length,
      minutes: Math.round(seconds / 60),
    },
  };
}

/** One category, for its own editing screen. Null when the slug is not one. */
export async function getAdminCategory(db: Scoped, categoryId: string): Promise<AdminCategory | null> {
  const category = await db.findOne<CategoryDoc>("categories", { id: categoryId });
  if (!category) return null;

  const lessons = await db.find<LessonDoc>("lessons", { categoryId }, { sort: { sortOrder: 1 } });
  const assetIds = lessons.map((l) => l.videoAssetId).filter((id): id is string => Boolean(id));
  const assetRows = assetIds.length ? await db.find<VideoAssetDoc>("video_assets", { id: { $in: assetIds } }) : [];
  const assets = new Map(assetRows.map((a) => [a.id, a]));

  return shape(
    category,
    lessons.map((l) => toLesson(l, assets))
  );
}

/** How many lessons are free right now, across everything. The editor shows this constantly. */
export async function countFreeLessons(db: Scoped): Promise<number> {
  return db.countDocuments<LessonDoc>("lessons", { isFree: true });
}
