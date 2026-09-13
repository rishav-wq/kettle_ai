"use client";

import Link from "next/link";
import { useState } from "react";
import { Wordmark } from "@/components/logo";
import { cn } from "@/lib/cn";

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
  { href: "#courses", label: "Courses" },
  { href: "#how", label: "How it works" },
  { href: "#questions", label: "Questions" },
  { href: "/gold", label: "Pricing" },
];

export function SiteNav({ firstLessonHref }: { firstLessonHref: string }) {
  const [open, setOpen] = useState(false);

  return (
    <nav aria-label="Main" className="flex flex-col">
      <div className="flex min-h-[64px] items-center gap-3">
        <Wordmark href="/" className="text-white" size="lg" />

        <div className="ml-auto hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-pill px-4 py-2.5 text-[0.9rem] font-medium text-white/80 transition-colors hover:bg-white/12 hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          <Link
            href="/signin"
            className="hidden min-h-[44px] items-center rounded-pill px-4 text-[0.88rem] font-semibold text-white/85 transition-colors hover:text-white sm:flex"
          >
            Sign in
          </Link>
          <Link
            href={firstLessonHref}
            className="hidden min-h-[44px] items-center rounded-pill bg-white px-5 text-[0.88rem] font-semibold text-violet shadow-s transition-transform hover:scale-[1.02] lg:flex"
          >
            Start free
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="site-nav-menu"
            aria-label={open ? "Close menu" : "Open menu"}
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
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="flex min-h-[48px] items-center rounded-pill px-4 text-[0.95rem] font-medium text-white/90 hover:bg-white/12"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/signin"
            className="flex min-h-[48px] items-center rounded-pill px-4 text-[0.95rem] font-semibold text-white sm:hidden"
          >
            Sign in
          </Link>
        </div>
      ) : null}
    </nav>
  );
}
