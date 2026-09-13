import type { MetadataRoute } from "next";
import { asc, eq } from "drizzle-orm";
import { withPublic } from "@/lib/db/tenant";
import { courses, lessons } from "@/lib/db/schema";
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
    const rows = await withPublic(async (tx) => ({
      c: await tx.select({ id: courses.id }).from(courses).where(eq(courses.isPublished, true)).orderBy(asc(courses.sortOrder)),
      l: await tx.select({ id: lessons.id }).from(lessons).where(eq(lessons.isFree, true)),
    }));

    return [
      ...staticEntries,
      ...rows.c.map((x) => ({ url: `${root}/courses/${x.id}`, changeFrequency: "weekly" as const, priority: 0.8 })),
      ...rows.l.map((x) => ({ url: `${root}/lessons/${x.id}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    ];
  } catch {
    return staticEntries;
  }
}
