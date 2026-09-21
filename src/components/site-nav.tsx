"use client";

import Link from "next/link";
import { useState } from "react";
import { Wordmark } from "@/components/logo";
import { LanguageToggle } from "@/components/language-toggle";
import { cn } from "@/lib/cn";
import { T } from "@/components/bilingual";

/*
  The marketing navigation.

  On a phone it is the logo, one action, and a disclosure that opens the rest,
  because a row of five links at 360px either wraps or shrinks below a usable
  tap target. From lg the links sit inline.

  Most links are in-page anchors, because this is one landing page and sending
  someone to another URL to read three sentences is worse than scrolling them
  there. Pricing is the exception: the price lives on /gold, so the link goes
  to the real page rather than an anchor that no longer exists.
*/

const LINKS = [
  { href: "#lessons", hi: "Lessons", en: "Lessons" },
  { href: "#how", hi: "यह कैसे चलता है", en: "How it works" },
  { href: "#questions", hi: "सवाल", en: "Questions" },
  { href: "/gold", hi: "क़ीमत", en: "Pricing" },
];

export function SiteNav({ firstLessonHref, lang }: { firstLessonHref: string; lang: "hi" | "en" }) {
  const [open, setOpen] = useState(false);
  /*
    One item in the opened menu is always filled, starting with the first.

    An all-grey list gives a reader no entry point, and on a panel this dark
    every item looks equally inert. Holding the last tapped one filled also
    answers "where did that take me" after the menu closes and reopens, which
    an anchor link cannot answer by itself: these are in-page sections, so the
    URL does not change and there is no route to read the state from.
  */
  const [picked, setPicked] = useState(LINKS[0].href);

  return (
    <nav aria-label="Main" className="flex flex-col">
      <div className="flex min-h-[64px] items-center gap-3">
        <Wordmark href="/" className="text-white" size="lg" tone="milk" />

        <div className="ml-auto hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-pill px-4 py-2.5 text-[0.9rem] font-medium text-white/80 transition-colors hover:bg-white/12 hover:text-white"
            >
              <T hi={l.hi} en={l.en} />
            </a>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          {/* Before sign-in, on the panel, where someone deciding whether this
              product is for them can find it without reading English first. */}
          <LanguageToggle current={lang} tone="onGrad" />
          <Link
            href="/signin"
            className="hidden min-h-[44px] items-center rounded-pill px-4 text-[0.88rem] font-semibold text-white/85 transition-colors hover:text-white sm:flex"
          >
            <T hi="साइन इन" en="Sign in" />
          </Link>
          <Link
            href={firstLessonHref}
            className="hidden min-h-[44px] items-center rounded-pill bg-white px-5 text-[0.88rem] font-semibold text-violet shadow-s transition-transform hover:scale-[1.02] lg:flex"
          >
            <T hi="मुफ़्त शुरू कीजिए" en="Start free" />
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="site-nav-menu"
            aria-label={open ? (lang === "hi" ? "मेन्यू बंद कीजिए" : "Close menu") : lang === "hi" ? "मेन्यू खोलिए" : "Open menu"}
            className="grid h-11 w-11 flex-none place-items-center rounded-pill bg-white/18 backdrop-blur-sm transition-colors hover:bg-white/28 lg:hidden"
          >
            <span aria-hidden className="relative block h-[14px] w-[18px]">
              <span className={cn("absolute left-0 block h-[2px] w-full rounded bg-white transition-transform", open ? "top-1/2 rotate-45" : "top-0")} />
              <span className={cn("absolute left-0 top-1/2 block h-[2px] w-full -translate-y-1/2 rounded bg-white transition-opacity", open && "opacity-0")} />
              <span className={cn("absolute left-0 block h-[2px] w-full rounded bg-white transition-transform", open ? "top-1/2 -rotate-45" : "bottom-0")} />
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <div id="site-nav-menu" className="mt-3 flex flex-col gap-1 rounded-card bg-white/12 p-2 backdrop-blur-sm lg:hidden">
          {LINKS.map((l) => {
            const on = picked === l.href;
            return (
              <a
                key={l.href}
                href={l.href}
                aria-current={on ? "true" : undefined}
                onClick={() => {
                  setPicked(l.href);
                  setOpen(false);
                }}
                className={cn(
                  "flex min-h-[48px] items-center rounded-pill px-4 text-[0.95rem] transition-colors",
                  on ? "bg-white font-semibold text-violet" : "font-medium text-white/90 hover:bg-white/12"
                )}
              >
                <T hi={l.hi} en={l.en} />
              </a>
            );
          })}
          <Link
            href="/signin"
            className="flex min-h-[48px] items-center rounded-pill px-4 text-[0.95rem] font-semibold text-white sm:hidden"
          >
            <T hi="साइन इन" en="Sign in" />
          </Link>
        </div>
      ) : null}
    </nav>
  );
}
