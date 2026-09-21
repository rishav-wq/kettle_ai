import Link from "next/link";
import { AppShell, GradHeader } from "@/components/app-shell";
import { Button, Card, LessonRow } from "@/components/ui";
import { withTenant } from "@/lib/db/tenant";
import { getCategoryCompletion, getContinue } from "@/lib/content/progress";
import { getViewer } from "@/lib/viewer";
import { T } from "@/components/bilingual";

export const dynamic = "force-dynamic";
export const metadata = { title: "My classes" };

export default async function MinePage() {
  const viewer = await getViewer();

  if (!viewer.userId) {
    return (
      <AppShell
        viewer={viewer}
        tab="mine"
        header={
          <GradHeader
            title={<T hi="मेरी क्लास" en="My classes" />}
            subtitle={<T hi="साइन इन कीजिए, हम याद रखेंगे कि आप कहाँ रुके थे।" en="Sign in and we remember where you stopped." />}
          />
        }
      >
        <div>
          <Empty />
        </div>
      </AppShell>
    );
  }

  const { current, categories } = await withTenant(viewer.tenantId, async (tx) => ({
    current: await getContinue(tx, viewer.userId!),
    categories: await getCategoryCompletion(tx, viewer.userId!),
  }));

  const finished = categories.filter((c) => c.done >= c.total);
  const started = categories.filter((c) => c.done < c.total);

  return (
    <AppShell
      viewer={viewer}
      tab="mine"
      header={
        <GradHeader
          title={
            viewer.name ? (
              <T hi={`नमस्ते, ${viewer.name} जी`} en={`Namaste, ${viewer.name} ji`} />
            ) : (
              <T hi="मेरी क्लास" en="My classes" />
            )
          }
          subtitle={<T hi="जो कुछ आपने शुरू किया है।" en="Everything you have started." />}
        />
      }
    >
      <div className="flex flex-col gap-7">
        {current ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-[1.05rem] font-bold">
              <T hi="जहाँ छोड़ा था, वहीं से" en="Pick up where you left" />
            </h2>
            <LessonRow
              index={current.sortOrder}
              title={<T hi={current.lessonTitleHi} en={current.lessonTitleEn} />}
              meta={
                <T
                  hi={`${current.categoryNameHi} · ${current.lessonCount} में से ${current.sortOrder}`}
                  en={`${current.categoryNameEn} · ${current.sortOrder} of ${current.lessonCount}`}
                />
              }
              progress={current.durationSec > 0 ? current.watchedSec / current.durationSec : 0}
              current
              href={`/lessons/${current.lessonId}`}
            />
          </section>
        ) : null}

        {started.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-[1.05rem] font-bold">
              <T hi="चल रहे हैं" en="In progress" />
            </h2>
            <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
              {started.map((c) => (
                <CategoryProgress key={c.categoryId} {...c} />
              ))}
            </div>
          </section>
        ) : null}

        {finished.length > 0 ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
              <h2 className="text-[1.05rem] font-bold">
                <T hi="पूरे हो गए" en="Finished" />
              </h2>
              <span className="ml-auto text-[0.85rem] font-medium tabular-nums text-ink-3">{finished.length}</span>
            </div>
            <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
              {finished.map((c) => (
                <CategoryProgress key={c.categoryId} {...c} />
              ))}
            </div>
          </section>
        ) : null}

        {!current && categories.length === 0 ? <Empty signedIn /> : null}
      </div>
    </AppShell>
  );
}

function CategoryProgress({
  categoryId,
  nameHi,
  nameEn,
  done,
  total,
}: {
  categoryId: string;
  nameHi: string;
  nameEn: string;
  done: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <Link href={`/learn/${categoryId}`} className="flex flex-col gap-3 rounded-tile bg-paper p-4 shadow-s transition-shadow hover:shadow-m">
      <div className="flex items-baseline gap-3">
        <span className="min-w-0 flex-1 truncate text-[0.98rem] font-semibold">
          <T hi={nameHi} en={nameEn} />
        </span>
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
      <h2 className="text-[1.2rem] font-bold">
        <T hi="अभी कुछ शुरू नहीं किया" en="Nothing started yet" />
      </h2>
      <p className="max-w-[32ch] text-[0.94rem] leading-relaxed text-ink-2">
        {signedIn ? (
          <T hi="कोई भी lesson चलाइए, हम याद रखेंगे कि आप कहाँ रुके थे।" en="Play any lesson and we will remember where you stopped." />
        ) : (
          <T hi="साइन इन कीजिए, हम याद रखेंगे कि आप कहाँ रुके थे।" en="Sign in and we remember where you stopped." />
        )}
      </p>
      <Button href={signedIn ? "/learn" : "/signin?next=/mine"} full>
        {signedIn ? <T hi="lessons देखिए" en="See the lessons" /> : <T hi="साइन इन कीजिए" en="Sign in" />}
      </Button>
    </Card>
  );
}
