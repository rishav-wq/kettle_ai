import Link from "next/link";
import { AppShell, GradHeader } from "@/components/app-shell";
import { Button, Card, LessonRow } from "@/components/ui";
import { withTenant } from "@/lib/db/tenant";
import { getContinue, getCourseCompletion } from "@/lib/content/progress";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata = { title: "My classes" };

export default async function MinePage() {
  const viewer = await getViewer();

  if (!viewer.userId) {
    return (
      <AppShell viewer={viewer} tab="mine" header={<GradHeader title="My classes" subtitle="Sign in and we remember where you stopped." />}>
        <div className="pt-6">
          <Empty />
        </div>
      </AppShell>
    );
  }

  const { current, courses } = await withTenant(viewer.tenantId, async (tx) => ({
    current: await getContinue(tx, viewer.userId!),
    courses: await getCourseCompletion(tx, viewer.userId!),
  }));

  const finished = courses.filter((c) => c.done >= c.total);
  const started = courses.filter((c) => c.done < c.total);

  return (
    <AppShell
      viewer={viewer}
      tab="mine"
      header={<GradHeader title={viewer.name ? `Hello, ${viewer.name}` : "My classes"} subtitle="Everything you have started." />}
    >
      <div className="flex flex-col gap-7 pt-6">
        {current ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-[1.05rem] font-bold">Pick up where you left</h2>
            <LessonRow
              index={current.sortOrder}
              title={current.lessonTitleEn}
              meta={`${current.courseTitleEn} · ${current.sortOrder} of ${current.lessonCount}`}
              progress={current.durationSec > 0 ? current.watchedSec / current.durationSec : 0}
              current
              href={`/lessons/${current.lessonId}`}
            />
          </section>
        ) : null}

        {started.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-[1.05rem] font-bold">In progress</h2>
            <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
              {started.map((c) => (
                <CourseProgress key={c.courseId} {...c} />
              ))}
            </div>
          </section>
        ) : null}

        {finished.length > 0 ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
              <h2 className="text-[1.05rem] font-bold">Finished</h2>
              <span className="ml-auto text-[0.85rem] font-medium tabular-nums text-ink-3">{finished.length}</span>
            </div>
            <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
              {finished.map((c) => (
                <CourseProgress key={c.courseId} {...c} />
              ))}
            </div>
          </section>
        ) : null}

        {!current && courses.length === 0 ? <Empty signedIn /> : null}
      </div>
    </AppShell>
  );
}

function CourseProgress({ courseId, titleEn, done, total }: { courseId: string; titleEn: string; done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <Link href={`/courses/${courseId}`} className="flex flex-col gap-3 rounded-tile bg-paper p-4 shadow-s transition-shadow hover:shadow-m">
      <div className="flex items-baseline gap-3">
        <span className="min-w-0 flex-1 truncate text-[0.98rem] font-semibold">{titleEn}</span>
        <span className="flex-none text-[0.82rem] font-medium tabular-nums text-ink-3">
          {done} / {total}
        </span>
      </div>
      <span aria-hidden className="block h-2 overflow-hidden rounded-full bg-line-2">
        <span className="block h-full rounded-full bg-violet" style={{ width: `${pct}%` }} />
      </span>
    </Link>
  );
}

function Empty({ signedIn }: { signedIn?: boolean }) {
  return (
    /* An empty state has one short sentence in it, so it takes a card the size
       of its content rather than the full canvas. */
    <Card className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-4 px-6 py-10 text-center">
      <h2 className="text-[1.2rem] font-bold">Nothing started yet</h2>
      <p className="max-w-[32ch] text-[0.94rem] leading-relaxed text-ink-2">
        {signedIn ? "Play any lesson and we will remember where you stopped." : "Sign in and we remember where you stopped."}
      </p>
      <Button href={signedIn ? "/learn" : "/signin?next=/mine"} full>
        {signedIn ? "See courses" : "Sign in"}
      </Button>
    </Card>
  );
}
