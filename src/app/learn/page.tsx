import { pageMetadata } from "@/lib/seo";
import { AppShell, GradHeader } from "@/components/app-shell";
import { Button, Tile } from "@/components/ui";
import { SearchIcon } from "@/components/icons";
import { withTenant } from "@/lib/db/tenant";
import { getCatalog } from "@/lib/content/queries";
import { getViewer } from "@/lib/viewer";
import { T } from "@/components/bilingual";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/pick";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({
  title: "AI lessons for beginners",
  description: "Explore practical AI lessons for everyday life, online safety, messages, letters, planning, travel, and work.",
  pathname: "/learn",
});

/** How many lessons a shelf shows before it is worth offering the whole category. */
const SHELF = 4;

/*
  Categories, each a shelf of lessons.

  Two levels: tap a category heading's "See all" for the rest, or tap a lesson
  and it plays. Courses used to sit in between and were removed — in eight of
  the eleven filled categories there was exactly one, so it was a tap to a page
  that repeated the category under a near-identical name.
*/
export default async function LearnPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await getViewer();
  const catalog = await withTenant(viewer.tenantId, getCatalog);
  const { q } = await searchParams;
  const lang = await getLang();

  /*
    Matching happens here rather than in the database: the whole catalogue is
    sixty-seven lessons, already loaded, and a round trip to Atlas to filter
    sixty-seven strings would be slower than filtering them.

    Both languages are searched whichever one the interface is in. Someone
    reading in Hindi may well type "scam", and someone reading in English may
    type a Devanagari word off the card they just saw.
  */
  const query = (q ?? "").trim().toLowerCase();
  const has = (...fields: string[]) => fields.some((f) => f.toLowerCase().includes(query));
  const searched = query
    ? catalog
        .map((c) => ({
          ...c,
          lessons: has(c.nameEn, c.nameHi) ? c.lessons : c.lessons.filter((l) => has(l.titleEn, l.titleHi)),
        }))
        .filter((c) => c.lessons.length > 0)
    : catalog;

  const preferred = viewer.preferredCategoryId;
  const ordered =
    preferred && !query
      ? [...searched.filter((c) => c.id === preferred), ...searched.filter((c) => c.id !== preferred)]
      : searched;

  return (
    <AppShell
      viewer={viewer}
      tab="learn"
      header={
        <GradHeader
          title={
            viewer.name ? (
              <T hi={`नमस्ते, ${viewer.name} जी`} en={`Namaste, ${viewer.name} ji`} />
            ) : (
              <T hi="AI सीखिए" en="Learn AI" />
            )
          }
          subtitle={
            viewer.name ? (
              <T hi="आज आप क्या सीखना चाहेंगे?" en="What would you like to learn today?" />
            ) : (
              <T hi="आप क्या सीखना चाहेंगे?" en="What would you like to learn?" />
            )
          }
          tall
        >
          <form action="/learn" className="relative mt-5 lg:max-w-[460px]">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3" />
            <input
              name="q"
              // Keeps what was typed after the page reloads, so refining a
              // search does not mean retyping it.
              defaultValue={q ?? ""}
              placeholder={pick(lang, "खोजिए: चिट्ठी, WhatsApp, सुरक्षा…", "Search: letters, WhatsApp, safety…")}
              aria-label={pick(lang, "कोर्स खोजिए", "Search lessons")}
              className="self-ring h-[54px] w-full rounded-pill bg-paper pl-12 pr-4 text-[0.95rem] text-ink shadow-m focus:ring-2 focus:ring-white/70 placeholder:text-ink-3"
            />
          </form>
        </GradHeader>
      }
    >
      <div className="flex flex-col gap-8 lg:gap-12">
        {/* data-category is a contract for scripts/smoke.mjs, which checks the
            chosen category floats to the top. Category names are content and
            get rewritten; an id does not. */}
        {ordered.map((cat, i) => (
          <section key={cat.id} data-category={cat.id} className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
              <h2 className="text-[1.15rem] font-bold">
                <T hi={cat.nameHi} en={cat.nameEn} />
              </h2>
              {cat.blurbEn ? (
                <p className="text-[0.85rem] font-medium text-ink-3">
                  <T hi={cat.blurbHi ?? cat.blurbEn} en={cat.blurbEn} />
                </p>
              ) : null}
              {i === 0 && preferred === cat.id ? (
                <span className="rounded-pill bg-wash px-2.5 py-1 text-[0.68rem] font-semibold text-violet">
                  <T hi="आपकी पसंद" en="Your pick" />
                </span>
              ) : null}
              {/* "See all" only where the shelf does not already show
                  everything. A link to no more than is already on screen is
                  just another thing to read. */}
              {cat.lessons.length > SHELF ? (
                <a
                  href={`/learn/${cat.id}`}
                  className="ml-auto flex-none text-[0.85rem] font-semibold text-violet underline underline-offset-4"
                >
                  <T hi={`सभी ${cat.lessons.length}`} en={`All ${cat.lessons.length}`} />
                </a>
              ) : (
                <span className="ml-auto text-[0.82rem] font-medium tabular-nums text-ink-3">
                  {cat.lessons.length > 0 ? cat.lessons.length : null}
                </span>
              )}
            </div>

            {cat.lessons.length === 0 ? (
              /* Nothing filmed here yet. Said plainly rather than hidden, so
                 the shape of the finished product is visible from the first
                 visit. */
              <div className="flex items-center gap-3 rounded-card border border-dashed border-line bg-paper/60 px-5 py-6">
                <span className="text-[0.9rem] text-ink-3">
                  <T hi="जल्द आ रहा है" en="Coming soon" />
                </span>
              </div>
            ) : (
              /* A shelf rather than a grid. Seventeen categories stacked as
                 grids is a very long page; a row that scrolls sideways keeps
                 each category one glance tall. scroll-px-5 matches the gutter
                 so the mandatory snap does not scroll it out of view. */
              <div className="no-bar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 lg:mx-0 lg:scroll-px-0 lg:px-0">
                {cat.lessons.slice(0, SHELF).map((l) => (
                  <Tile
                    key={l.id}
                    href={`/lessons/${l.id}`}
                    image={l.imageUrl ?? undefined}
                    title={<T hi={l.titleHi} en={l.titleEn} />}
                    meta={<T hi={`${l.minutes} मिनट`} en={`${l.minutes} min`} />}
                    badge={l.isFree ? <T hi="मुफ़्त" en="Free" /> : undefined}
                    locked={!l.isFree && viewer.state !== "gold"}
                    className="w-[calc((100%-1rem)/2)] flex-none snap-start sm:w-[200px] lg:w-[230px]"
                  />
                ))}
              </div>
            )}
          </section>
        ))}

        {/* A search that finds nothing has to say so, and has to offer the way
            back. Silence reads as a broken page. */}
        {query && ordered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-card bg-paper px-5 py-10 text-center shadow-s">
            <p className="text-[1.05rem] font-semibold">
              <T hi={`“${q}” के लिए कुछ नहीं मिला`} en={`Nothing matched “${q}”`} />
            </p>
            <p className="max-w-[34ch] text-[0.92rem] leading-relaxed text-ink-3">
              <T
                hi="छोटा शब्द आज़माइए — जैसे “scam”, “चिट्ठी” या “यात्रा”।"
                en="Try a shorter word, like “scam”, “letter” or “travel”."
              />
            </p>
            <Button href="/learn" variant="soft">
              <T hi="सभी कोर्स दिखाइए" en="Show everything" />
            </Button>
          </div>
        ) : null}

        {catalog.length === 0 ? (
          <p className="rounded-card bg-paper px-5 py-8 text-center text-ink-3 shadow-s">
            No lessons yet. Run <code className="font-mono text-[0.85em]">npm run db:seed</code>.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
