import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AppShell, GradHeader } from "@/components/app-shell";
import { Card, Rule } from "@/components/ui";
import { PlayIcon } from "@/components/icons";
import { withPublic, withTenant } from "@/lib/db/tenant";
import { getCatalogStats, getCategory } from "@/lib/content/queries";
import { getCategoryProgress } from "@/lib/content/progress";
import { slug as slugSchema } from "@/lib/security/validators";
import { getViewer, lockReason } from "@/lib/viewer";
import { GOLD, formatRupees, goldListPrice } from "@/lib/payments/plan";
import { pageMetadata, SITE_NAME, siteUrl } from "@/lib/seo";
import { T } from "@/components/bilingual";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/pick";
import { CategoryLessons, ResumePlayButton, StartLessonCta } from "./lessons";

export const dynamic = "force-dynamic";

/*
  One category, and everything in it.

  This is what a course page used to be. Courses were flattened away, so the
  category is the only grouping left and this is where a long one — seventeen
  safety lessons — is read in full rather than through a shelf.
*/
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!slugSchema.safeParse(slug).success) return {};
  const category = await withPublic((db) => getCategory(db, slug));
  if (!category) return {};
  return pageMetadata({
    title: category.nameEn,
    description: category.descriptionEn ?? category.blurbEn ?? `${category.nameEn} lessons on Kettle.`,
    pathname: `/learn/${category.id}`,
  });
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slugSchema.safeParse(slug).success) notFound();

  const viewer = await getViewer();
  const lang = await getLang();

  /* How much of the catalogue plays today, for the paywall sheet. Counted, not claimed. */
  const stats = await withTenant(viewer.tenantId, getCatalogStats);

  const { category, progress } = await withTenant(viewer.tenantId, async (db) => {
    const found = await getCategory(db, slug);
    if (!found || !viewer.userId) return { category: found, progress: new Map() };
    return { category: found, progress: await getCategoryProgress(db, viewer.userId, found.id) };
  });
  if (!category) notFound();

  const totalMin = category.lessons.reduce((n, l) => n + l.minutes, 0);
  const done = category.lessons.filter((l) => progress.get(l.id)?.completed).length;
  const resume = category.lessons.find((l) => !progress.get(l.id)?.completed) ?? category.lessons[0];
  const pct = category.lessons.length ? Math.round((done / category.lessons.length) * 100) : 0;
  const resumeLocked = resume ? lockReason(viewer, resume) : null;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: category.nameEn,
    description: category.descriptionEn ?? undefined,
    url: siteUrl(`/learn/${category.id}`).toString(),
    inLanguage: "en-IN",
    educationalLevel: "Beginner",
    provider: { "@type": "Organization", name: SITE_NAME, url: siteUrl("/").toString() },
    isAccessibleForFree: category.lessons.some((l) => l.isFree),
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      instructor: { "@type": "Organization", name: SITE_NAME },
    },
  };

  return (
    <AppShell
      viewer={viewer}
      tab="learn"
      header={
        <GradHeader back={{ href: "/learn", label: pick(lang, "सब कुछ", "Everything") }} tall>
          <div className="grid place-items-center py-6">
            {resume ? (
              <ResumePlayButton
                href={`/lessons/${resume.id}`}
                label={pick(lang, `${resume.titleHi} चलाइए`, `Play ${resume.titleEn}`)}
                lockedBecause={resumeLocked}
                months={GOLD.months}
                price={formatRupees(GOLD.amountPaise)}
                listPrice={goldListPrice()}
                ready={stats.lessons}
                coming={stats.comingSoon}
                signedIn={Boolean(viewer.userId)}
                className="grid h-[88px] w-[88px] place-items-center rounded-full border-2 border-white/45 text-white transition-transform hover:scale-105"
              >
                <PlayIcon className="ml-1 h-9 w-9" />
              </ResumePlayButton>
            ) : null}
          </div>
        </GradHeader>
      }
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-7">
        <Card className="flex flex-col gap-3 p-5 lg:order-2 lg:sticky lg:top-8 lg:p-6">
          <Rule />
          <div>
            <h1 className="text-[1.4rem] font-bold leading-tight">
              <T hi={category.nameHi} en={category.nameEn} />
            </h1>
            {category.blurbEn ? (
              <p className="mt-1 text-[0.9rem] text-ink-3">
                <T hi={category.blurbHi ?? category.blurbEn} en={category.blurbEn} />
              </p>
            ) : null}
          </div>

          {category.descriptionEn ? (
            <p className="text-[0.95rem] leading-relaxed text-ink-2">
              <T hi={category.descriptionHi ?? category.descriptionEn} en={category.descriptionEn} />
            </p>
          ) : null}

          <dl className="mt-1 flex items-center gap-6">
            <Fact v={String(category.lessons.length)} label={<T hi="Lessons" en="Lessons" />} />
            <Fact v={`${totalMin}`} label={<T hi="मिनट" en="Minutes" />} />
            <Fact v={done > 0 ? `${pct}%` : "—"} label={<T hi="पूरा" en="Done" />} />
          </dl>

          {done > 0 ? (
            <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-line-2">
              <span className="block h-full rounded-full bg-violet" style={{ width: `${pct}%` }} />
            </span>
          ) : null}
        </Card>

        <section className="flex flex-col gap-3 lg:order-1">
          <h2 className="text-[1.05rem] font-bold">
            <T hi="छोटे lessons" en="Short lessons" />
          </h2>
          <CategoryLessons
            rows={category.lessons.map((l) => {
              const p = progress.get(l.id);
              return {
                id: l.id,
                index: l.sortOrder,
                title: <T hi={l.titleHi} en={l.titleEn} />,
                meta: metaFor(l.minutes, l.isFree, p?.watchedSec ?? 0, Boolean(p?.completed), l.hasVideo),
                progress: l.minutes > 0 ? (p?.watchedSec ?? 0) / (l.minutes * 60) : 0,
                done: Boolean(p?.completed),
                current: resume?.id === l.id && done > 0,
                lockedBecause: lockReason(viewer, l),
              };
            })}
            months={GOLD.months}
            price={formatRupees(GOLD.amountPaise)}
            listPrice={goldListPrice()}
            ready={stats.lessons}
            coming={stats.comingSoon}
            signedIn={Boolean(viewer.userId)}
          />
        </section>

        {resume ? (
          /* Full width on a phone, where it is the thumb target; a normal
             button on desktop, where a 1000px-wide button reads as a banner. */
          <StartLessonCta
            href={`/lessons/${resume.id}`}
            label={
              done > 0 ? (
                <T hi="जहाँ छोड़ा था, वहीं से" en="Pick up where you left" />
              ) : (
                <T hi="पहला lesson शुरू कीजिए" en="Start the first lesson" />
              )
            }
            lockedBecause={lockReason(viewer, resume)}
            months={GOLD.months}
            price={formatRupees(GOLD.amountPaise)}
            listPrice={goldListPrice()}
            ready={stats.lessons}
            coming={stats.comingSoon}
            signedIn={Boolean(viewer.userId)}
            className="lg:order-3 lg:w-auto lg:min-w-[320px] lg:justify-self-start"
          />
        ) : null}
      </div>
    </AppShell>
  );
}

/* Returns an element rather than a string: this line is assembled from a
   number and a word, and the word is what changes. */
function metaFor(min: number, isFree: boolean, watchedSec: number, completed: boolean, hasVideo: boolean) {
  if (!hasVideo) return <T hi="video जोड़ी जा रही है" en="Video being added" />;
  if (completed) return <T hi={`${min} मिनट · देख लिया`} en={`${min} min · Watched`} />;
  if (watchedSec > 0) {
    const left = Math.max(1, min - Math.round(watchedSec / 60));
    return <T hi={`${min} मिनट · ${left} मिनट बाकी`} en={`${min} min · ${left} min left`} />;
  }
  return isFree ? <T hi={`${min} मिनट · मुफ़्त`} en={`${min} min · Free`} /> : <T hi={`${min} मिनट`} en={`${min} min`} />;
}

function Fact({ v, label }: { v: string; label: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dd className="text-[1.15rem] font-bold leading-none tabular-nums text-violet">{v}</dd>
      <dt className="mt-1 text-[0.75rem] font-medium text-ink-3">{label}</dt>
    </div>
  );
}
