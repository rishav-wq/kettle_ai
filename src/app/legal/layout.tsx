import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/logo";
import { T } from "@/components/bilingual";

/*
  Policy pages.

  Razorpay checks that these exist and are reachable without signing in before
  it approves a live account, so they are plain server-rendered pages with no
  gating. The content is a working draft written from how the product actually
  behaves; a lawyer should review it, and every TO CONFIRM must be filled with
  real entity details before launch.
*/
export default function LegalLayout({ children }: { children: ReactNode }) {
  const links = [
    { href: "/legal/privacy", hi: "निजता", en: "Privacy" },
    { href: "/legal/terms", hi: "शर्तें", en: "Terms" },
    { href: "/legal/refunds", hi: "वापसी", en: "Refunds" },
    { href: "/legal/contact", hi: "संपर्क", en: "Contact" },
  ];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col bg-ground lg:max-w-[820px]">
      <header className="grad rounded-b-[34px] px-5 pb-8 pt-[calc(16px+env(safe-area-inset-top))] text-white lg:mt-8 lg:rounded-[26px] lg:px-9 lg:pt-7">
        <div className="flex min-h-[44px] items-center">
          <Wordmark href="/" className="text-white" size="sm" tone="milk" />
          <Link href="/help" className="ml-auto min-h-[44px] rounded-pill bg-white/18 px-4 py-2.5 text-[0.85rem] font-semibold backdrop-blur-sm hover:bg-white/28">
            <T hi="मदद" en="Help" />
          </Link>
        </div>
      </header>

      <main className="px-5 pb-14 pt-7 lg:px-0">
        <article className="flex flex-col gap-4 rounded-card bg-paper p-6 shadow-s lg:p-10">{children}</article>

        <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="min-h-[36px] text-[0.86rem] font-medium text-ink-3 underline underline-offset-4 hover:text-violet">
              <T hi={l.hi} en={l.en} />
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
