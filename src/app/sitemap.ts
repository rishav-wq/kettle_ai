import type { MetadataRoute } from "next";
import { withPublic } from "@/lib/db/tenant";
import type { CategoryDoc, LessonDoc } from "@/lib/db/documents";
import { base } from "./robots";

export const revalidate = 3600;

const STATIC = ["", "/learn", "/gold", "/help", "/legal/privacy", "/legal/terms", "/legal/refunds", "/legal/contact"];

/**
 * Published courses and free lessons only.
 *
 * A paid lesson has nothing a visitor can read, so listing it would send people
 * from a search result to a lock screen. That is a poor first impression and a
 * poor signal to the search engine.
 *
 * The build runs before the database exists, so a failed query degrades to the
 * static routes rather than failing the deploy. The next revalidation fills in
 * the rest.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const root = base();
  const staticEntries = STATIC.map((p) => ({
    url: `${root}${p}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.6,
  }));

  try {
    const rows = await withPublic(async (db) => ({
      c: await db.find<CategoryDoc>("categories", {}, { sort: { sortOrder: 1 }, projection: { id: 1 } }),
      l: await db.find<LessonDoc>("lessons", { isFree: true, isPublished: true }, { projection: { id: 1 } }),
    }));

    return [
      ...staticEntries,
      ...rows.c.map((x) => ({ url: `${root}/learn/${x.id}`, changeFrequency: "weekly" as const, priority: 0.8 })),
      ...rows.l.map((x) => ({ url: `${root}/lessons/${x.id}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    ];
  } catch {
    return staticEntries;
  }
}
