import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AppShell, GradHeader } from "@/components/app-shell";
import { Card, Rule } from "@/components/ui";
import { PlayIcon } from "@/components/icons";
import { withPublic, withTenant } from "@/lib/db/tenant";
import { getCourse } from "@/lib/content/queries";
import { getCourseProgress } from "@/lib/content/progress";
import { slug as slugSchema } from "@/lib/security/validators";
import { getViewer, lockReason } from "@/lib/viewer";
import { GOLD, formatRupees } from "@/lib/payments/plan";
import { pageMetadata, SITE_NAME, siteUrl } from "@/lib/seo";
import { T } from "@/components/bilingual";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/pick";
import { CourseLessons, ResumePlayButton, StartLessonCta } from "./lessons";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return {};

  const course = await withPublic((tx) => getCourse(tx, parsed.data));
  if (!course) return {};

  const description = course.descriptionEn ?? `A beginner-friendly AI course from ${SITE_NAME}, taught in short practical lessons.`;
  return pageMetadata({
    title: `${course.titleEn} | AI course for beginners`,
    description,
    pathname: `/courses/${course.id}`,
  });
}

/*
  Course detail.

  The third reference screen: a gradient panel with a large play control, a
  white card overlapping it carrying the title and the facts, then the list.

  The reference shows a star rating and a review count. We have neither, and
  inventing them would be the same lie as a fabricated testimonial, so the card
  carries lesson count, running time, and how far through you are instead.
*/
export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) notFound();

  const viewer = await getViewer();
  const { course, progress } = await withTenant(viewer.tenantId, async (tx) => {
    const found = await getCourse(tx, parsed.data);
    if (!found || !viewer.userId) return { course: found, progress: new Map() };
    return { course: found, progress: await getCourseProgress(tx, viewer.userId, found.id) };
  });
  if (!course) notFound();

  const totalMin = Math.round(course.lessons.reduce((n, l) => n + l.durationSec, 0) / 60);
  const done = course.lessons.filter((l) => progress.get(l.id)?.completed).length;
  const resume = course.lessons.find((l) => !progress.get(l.id)?.completed) ?? course.lessons[0];
  const pct = course.lessons.length ? Math.round((done / course.lessons.length) * 100) : 0;
  const resumeLocked = resume ? lockReason(viewer, resume) : null;
  const lang = await getLang();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.titleEn,
    description: course.descriptionEn ?? undefined,
    url: siteUrl(`/courses/${course.id}`).toString(),
    inLanguage: "en-IN",
    educationalLevel: "Beginner",
    provider: { "@type": "Organization", name: SITE_NAME, url: siteUrl("/").toString() },
    isAccessibleForFree: course.lessons.some((lesson) => lesson.isFree),
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
        <GradHeader back={{ href: "/learn", label: pick(lang, "सभी कोर्स", "All courses") }} tall>
          <div className="grid place-items-center py-6">
            {resume ? (
              <ResumePlayButton
                href={`/lessons/${resume.id}`}
                label={pick(lang, `lesson ${resume.sortOrder} चलाइए`, `Play lesson ${resume.sortOrder}`)}
                lockedBecause={resumeLocked}
                price={formatRupees(GOLD.amountPaise)}
                months={GOLD.months}
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
              <T hi={course.titleHi} en={course.titleEn} />
            </h1>
            <p className="mt-1 text-[0.9rem] text-ink-3">
              <T hi={course.categoryNameHi} en={course.categoryNameEn} />
            </p>
          </div>

          {course.descriptionEn ? (
            <p className="text-[0.95rem] leading-relaxed text-ink-2">
              <T hi={course.descriptionHi ?? course.descriptionEn} en={course.descriptionEn} />
            </p>
          ) : null}

          <dl className="mt-1 flex items-center gap-6">
            <Fact v={String(course.lessons.length)} label={<T hi="Lessons" en="Lessons" />} />
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
          <CourseLessons
            rows={course.lessons.map((l) => {
              const p = progress.get(l.id);
              return {
                id: l.id,
                index: l.sortOrder,
                title: <T hi={l.titleHi} en={l.titleEn} />,
                meta: metaFor(l.durationSec, l.isFree, p?.watchedSec ?? 0, Boolean(p?.completed)),
                progress: l.durationSec > 0 ? (p?.watchedSec ?? 0) / l.durationSec : 0,
                done: Boolean(p?.completed),
                current: resume?.id === l.id && done > 0,
                lockedBecause: lockReason(viewer, l),
              };
            })}
            price={formatRupees(GOLD.amountPaise)}
            months={GOLD.months}
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
                <T hi={`lesson ${resume.sortOrder} जारी रखिए`} en={`Continue lesson ${resume.sortOrder}`} />
              ) : (
                <T hi="lesson 1 शुरू कीजिए" en="Start lesson 1" />
              )
            }
            lockedBecause={lockReason(viewer, resume)}
            price={formatRupees(GOLD.amountPaise)}
            months={GOLD.months}
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
function metaFor(durationSec: number, isFree: boolean, watchedSec: number, completed: boolean) {
  const min = Math.max(1, Math.round(durationSec / 60));
  if (completed) return <T hi={`${min} मिनट · देख लिया`} en={`${min} min · Watched`} />;
  if (watchedSec > 0 && durationSec > 0) {
    const left = Math.max(1, Math.round((durationSec - watchedSec) / 60));
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
