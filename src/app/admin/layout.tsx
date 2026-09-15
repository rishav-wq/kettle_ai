import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/logo";
import { adminPhoneCount, getAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Kettle · Admin",
  // Nothing here should ever be indexed, linked, or previewed anywhere.
  robots: { index: false, follow: false, nocache: true },
};

/*
  The editor's frame.

  Guarded here rather than in each page, so a new page under /admin is private
  by default and a forgotten check is not possible. The check is the same one
  the API routes make; neither trusts the other.

  notFound() rather than a 403. A visitor who is not an admin should not learn
  that this address exists — it is the one route in the product whose
  existence is itself information, and a 403 confirms it while a 404 does not.

  English only, deliberately. Everything the audience reads is bilingual;
  this is the operator's tool, and the operator is one person who reads
  English. The content typed into it is bilingual, which is the part that
  matters.
*/
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getAdmin();
  if (!admin) notFound();

  const tabs = [
    { href: "/admin", label: "Catalogue" },
    { href: "/learn", label: "View as learner" },
  ];

  return (
    <div className="min-h-dvh bg-ground">
      <header className="grad px-5 pb-6 pt-[calc(14px+env(safe-area-inset-top))] text-white lg:px-10 lg:pb-7 lg:pt-6">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4">
          <div className="flex min-h-[44px] flex-wrap items-center gap-3">
            <Wordmark href="/" className="text-white" size="sm" tone="milk" />
            <span className="rounded-pill bg-white/18 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] backdrop-blur-sm">
              Admin
            </span>
            <span className="ml-auto text-[0.82rem] text-white/75">{admin.phone}</span>
          </div>
          <nav aria-label="Admin" className="flex flex-wrap gap-1">
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="min-h-[40px] rounded-pill px-4 py-2 text-[0.88rem] font-medium text-white/85 transition-colors hover:bg-white/12 hover:text-white"
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-6 lg:px-10 lg:pt-8">
        {adminPhoneCount() === 0 ? (
          <p className="mb-5 rounded-tile border border-dashed border-line px-4 py-3 text-[0.9rem] text-ink-3">
            ADMIN_PHONES is empty, so nobody can reach this. You are seeing it because the check ran before that was true.
          </p>
        ) : null}
        {children}
      </main>
    </div>
  );
}
