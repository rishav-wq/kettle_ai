import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell, GradHeader } from "@/components/app-shell";
import { Button, Card, Rule } from "@/components/ui";
import { withPublic, withTenant } from "@/lib/db/tenant";
import { getLesson } from "@/lib/content/queries";
import { getLessonProgress } from "@/lib/content/progress";
import { slug as slugSchema } from "@/lib/security/validators";
import { toPlayable } from "@/lib/video/embed";
import { GOLD, formatRupees } from "@/lib/payments/plan";
import { freeLeft, getViewer, lockReason } from "@/lib/viewer";
import { pageMetadata, SITE_NAME } from "@/lib/seo";
import { LessonStage } from "./stage";
import { T } from "@/components/bilingual";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/pick";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return {};

  const lesson = await withPublic((tx) => getLesson(tx, parsed.data));
  if (!lesson) return {};

  return pageMetadata({
    title: `${lesson.titleEn} | ${lesson.course.titleEn}`,
    description: `A short beginner lesson from ${SITE_NAME} about ${lesson.titleEn.toLowerCase()}. Learn practical AI skills step by step.`,
    pathname: `/lessons/${lesson.id}`,
  });
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) notFound();

  const viewer = await getViewer();
  const { lesson, progress } = await withTenant(viewer.tenantId, async (tx) => {
    const found = await getLesson(tx, parsed.data);
    if (!found || !viewer.userId) return { lesson: found, progress: null };
    return { lesson: found, progress: await getLessonProgress(tx, viewer.userId, found.id) };
  });
  if (!lesson) notFound();

  const reason = lockReason(viewer, lesson);
  const minutes = Math.max(1, Math.round((lesson.video?.durationSec ?? 0) / 60));
  const remaining = freeLeft(viewer);
  const lang = await getLang();

  return (
    <AppShell
      viewer={viewer}
      tab="learn"
      header={
        <GradHeader
          back={{ href: `/courses/${lesson.course.id}`, label: pick(lang, "कोर्स पर वापस", "Back to course") }}
          action={
            <span className="rounded-pill bg-white/18 px-3 py-1.5 text-[0.78rem] font-semibold text-white backdrop-blur-sm">
              <T
                hi={`${lesson.course.lessonCount} में से lesson ${lesson.sortOrder}`}
                en={`Lesson ${lesson.sortOrder} of ${lesson.course.lessonCount}`}
              />
            </span>
          }
          tall
        >
          {/*
            The stage is bounded by height, not width.

            A 16:9 video is only ever too wide because of what that does
            vertically: filling the 1168px panel would stand it 657px tall and
            push the lesson title off a laptop screen. So the cap is expressed
            the way the constraint actually works — a share of the viewport
            height, converted back into a width — with a hard ceiling so it
            stops growing before it dominates a tall monitor.

            66% is chosen so a 1080p screen reaches that ceiling rather than
            stopping just short of it, while a 1366x768 laptop still gets a
            video sized to the screen it has instead of one that pushes the
            lesson title out of sight.
          */}
          <div className="mx-auto w-full max-w-[min(1080px,calc(66dvh*16/9))]">
          <LessonStage
            lessonId={lesson.id}
            locked={reason}
            playable={reason ? { kind: "pending", reason: "locked" } : toPlayable(lesson.video, pick(lang, lesson.titleHi, lesson.titleEn))}
            durationSec={lesson.video?.durationSec ?? 0}
            startAtSec={progress?.watchedSec ?? 0}
            tracking={Boolean(viewer.userId)}
            signedIn={Boolean(viewer.userId)}
            price={formatRupees(GOLD.amountPaise)}
            months={GOLD.months}
          />
          </div>
        </GradHeader>
      }
    >
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
        <Card className="flex flex-col gap-2.5 p-5 lg:col-span-2 lg:p-6">
          <Rule />
          <h1 className="text-[1.3rem] font-bold leading-tight">
            <T hi={lesson.titleHi} en={lesson.titleEn} />
          </h1>
          <p className="text-[0.88rem] font-medium tabular-nums text-ink-3">
            <T
              hi={`${lesson.course.titleHi} · ${minutes} मिनट${progress?.completed ? " · देख लिया" : ""}`}
              en={`${lesson.course.titleEn} · ${minutes} min${progress?.completed ? " · Watched" : ""}`}
            />
          </p>
        </Card>

        {viewer.state === "free" && remaining > 0 ? (
          <p className="rounded-tile bg-wash px-4 py-3 text-[0.9rem] font-medium text-violet lg:col-span-2">
            <T
              hi={`${remaining} मुफ़्त ${remaining === 1 ? "lesson" : "lessons"} बाकी हैं।`}
              en={`${remaining} free ${remaining === 1 ? "lesson" : "lessons"} left.`}
            />
          </p>
        ) : null}

        {!reason && lesson.transcriptEn ? (
          <Card className="flex flex-col gap-2 p-5 lg:col-start-1 lg:row-start-3">
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-3">
              <T hi="साथ पढ़ें" en="Read along" />
            </span>
            <p className="text-[0.98rem] leading-[1.8] text-ink-2">
              <T hi={lesson.transcriptHi ?? lesson.transcriptEn} en={lesson.transcriptEn} />
            </p>
          </Card>
        ) : null}

        {!reason ? (
          <div className="flex flex-col gap-2.5 lg:col-start-2 lg:row-start-3">
            {lesson.next ? (
              <Button href={`/lessons/${lesson.next.id}`} size="lg" full>
                <T hi="अगला lesson" en="Next lesson" />
              </Button>
            ) : (
              <Button href={`/courses/${lesson.course.id}`} size="lg" full>
                <T hi="कोर्स पूरा हुआ" en="Course finished" />
              </Button>
            )}
            <Button href={`/courses/${lesson.course.id}`} variant="ghost" full>
              <T hi="सभी lessons" en="All lessons" />
            </Button>
          </div>
        ) : (
          /* A locked lesson has no next-lesson column, so this button has no
             sibling to sit beside: it spans both tracks and centres, rather
             than filling the first one and stopping short of the card above. */
          <Button
            href={`/courses/${lesson.course.id}`}
            variant="ghost"
            full
            className="lg:col-span-2 lg:mx-auto lg:w-auto lg:min-w-[300px]"
          >
            <T hi="सभी lessons" en="All lessons" />
          </Button>
        )}
      </div>
    </AppShell>
  );
}
