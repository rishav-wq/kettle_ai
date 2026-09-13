import { pageMetadata } from "@/lib/seo";
import { AppShell, GradHeader } from "@/components/app-shell";
import { Tile } from "@/components/ui";
import { SearchIcon } from "@/components/icons";
import { withTenant } from "@/lib/db/tenant";
import { getCatalog } from "@/lib/content/queries";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({
  title: "AI courses for beginners",
  description: "Explore practical AI courses for everyday life, online safety, messages, letters, planning, travel, and work.",
  pathname: "/learn",
});

/*
  Categories.

  The second reference screen: a gradient header carrying the title and the
  search field, then a two-column grid of white illustration cards that starts
  by overlapping the header.

  The category chosen at onboarding is floated to the top, which is the one
  thing the reference does not do and this product needs.
*/
export default async function LearnPage() {
  const viewer = await getViewer();
  const catalog = await withTenant(viewer.tenantId, getCatalog);

  const preferred = viewer.preferredCategoryId;
  const ordered = preferred
    ? [...catalog.filter((c) => c.id === preferred), ...catalog.filter((c) => c.id !== preferred)]
    : catalog;

  return (
    <AppShell
      viewer={viewer}
      tab="learn"
      header={
        <GradHeader title="Learn AI." subtitle="Short lessons for things you want to do on your phone." tall>
          <form action="/learn" className="relative mt-5 lg:max-w-[460px]">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3" />
            <input
              name="q"
              placeholder="Search: letters, WhatsApp, safety…"
              aria-label="Search courses"
              className="h-[54px] w-full rounded-pill bg-paper pl-12 pr-4 text-[0.95rem] text-ink shadow-m outline-none placeholder:text-ink-3"
            />
          </form>
        </GradHeader>
      }
    >
      <div className="mt-5 flex flex-col gap-8 lg:mt-6 lg:gap-12">
        {/* data-category is a contract for scripts/smoke.mjs, which checks the
            chosen category floats to the top. Category names are content and
            get rewritten; an id does not. */}
        {ordered.map((cat, i) => (
          <section key={cat.id} data-category={cat.id} className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
              <h2 className="text-[1.15rem] font-bold">{cat.nameEn}</h2>
              {i === 0 && preferred === cat.id ? (
                <span className="rounded-pill bg-wash px-2.5 py-1 text-[0.68rem] font-semibold text-violet">Your pick</span>
              ) : null}
              <span className="ml-auto text-[0.82rem] font-medium tabular-nums text-ink-3">{cat.courses.length}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
              {cat.courses.map((c) => (
                <Tile
                  key={c.id}
                  href={`/courses/${c.id}`}
                  image={c.imageUrl ?? undefined}
                  title={c.titleEn}
                  meta={`${c.lessonCount} lessons · ${c.minutes} min`}
                  badge={c.hasFree ? "Free" : undefined}
                />
              ))}
            </div>
          </section>
        ))}

        {catalog.length === 0 ? (
          <p className="rounded-card bg-paper px-5 py-8 text-center text-ink-3 shadow-s">
            No courses yet. Run <code className="font-mono text-[0.85em]">npm run db:seed</code>.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
