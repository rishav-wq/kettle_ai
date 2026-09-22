import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { withTenant } from "@/lib/db/tenant";
import { recentJoiners } from "@/lib/social-proof";
import { showsMarketing, type Viewer } from "@/lib/viewer";
import { SocialProof } from "@/components/social-proof";
import { Wordmark } from "@/components/logo";
import { ComfortChips } from "@/components/ui";
import { BookIcon, BookmarkIcon, HeartIcon, HelpIcon, PencilIcon, PersonIcon, StarIcon } from "@/components/icons";
import { T } from "@/components/bilingual";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/pick";

type Tab = "learn" | "mine" | "invite" | "account";

type Props = {
  viewer: Viewer;
  tab?: Tab;
  /** A Pine panel at the top of the page. Full bleed on a phone, a card on desktop. */
  header?: ReactNode;
  children: ReactNode;
};

/*
  One content width for the whole app.

  There used to be two, a "wide" one for catalogs and a narrower one for
  reading, and moving between Learn and Gold shifted the panel 230px sideways
  and changed its width — the frame moving is far more noticeable than any
  page being slightly wider than its ideal.

  So the frame is fixed and the content decides its own measure inside it: a
  catalog adds columns, a video caps its stage, a form caps its fields. Below
  1024px none of this applies; the page is one column with a gutter.
*/
const CANVAS = "lg:max-w-[1240px]";

/**
 * The app frame.
 *
 * Two layouts, one tree. On a phone it is a single column with a floating tab
 * bar, which is what this audience's thumbs expect. From 1024px the tab bar is
 * replaced by a sidebar and the Pine panel becomes a card inside a wider
 * content column, because a phone layout stranded in the middle of a desktop
 * window reads as an unfinished page.
 */
export async function AppShell({ viewer, tab, header, children }: Props) {
  const gold = viewer.state === "gold";
  const signedIn = Boolean(viewer.userId);
  const lang = await getLang();
  const joiners = showsMarketing(viewer) ? await withTenant(viewer.tenantId, (tx) => recentJoiners(tx, 6)) : [];

  /*
    Each tab carries both labels rather than one. The visible text goes through
    <T>, which CSS switches; the aria-label needs an actual string, because an
    attribute cannot be hidden by language the way an element can.

    "Gold" stays Latin in both. It is the name of the plan, not a word.
  */
  const tabs = [
    { key: "learn" as const, href: "/learn", hi: "सीखिए", en: "Learn", Icon: BookIcon },
    { key: "mine" as const, href: "/mine", hi: "मेरी क्लास", en: "My classes", Icon: BookmarkIcon },
    gold
      ? { key: "invite" as const, href: "/invite", hi: "न्योता", en: "Invite", Icon: HeartIcon }
      : { key: "invite" as const, href: "/gold", hi: "Gold", en: "Gold", Icon: StarIcon },
    {
      key: "account" as const,
      href: signedIn ? "/account" : "/signin",
      hi: signedIn ? "आप" : "साइन इन",
      en: signedIn ? "You" : "Sign in",
      Icon: PersonIcon,
    },
  ];

  return (
    <div className="min-h-dvh bg-ground lg:grid lg:grid-cols-[268px_1fr]">
      {/* Sidebar, desktop only. */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-r border-line bg-paper px-5 py-8 lg:flex">
        {/* px-4 puts the mark on the same left edge as the nav icons below it,
            which sit inside a pill with the same padding. px-2 left it 8px
            adrift of a column it is supposed to head. */}
        <Wordmark href="/" className="px-4 text-violet" size="lg" />

        <nav className="flex flex-col gap-1.5" aria-label={pick(lang, "मुख्य", "Main")}>
          {tabs.slice(0, 3).map(({ key, href, hi, en, Icon }) => {
            const active = tab === key;
            return (
              <Link
                key={key}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[52px] items-center gap-3.5 rounded-pill px-4 text-[0.98rem] font-semibold transition-colors",
                  active ? "bg-fill text-on-fill shadow-m" : "text-ink-3 hover:bg-wash hover:text-violet"
                )}
              >
                <Icon className="h-5 w-5 flex-none" filled={active} />
                <T hi={hi} en={en} />
              </Link>
            );
          })}
          <Link
            href="/help"
            className="flex min-h-[52px] items-center gap-3.5 rounded-pill px-4 text-[0.98rem] font-semibold text-ink-3 transition-colors hover:bg-wash hover:text-violet"
          >
            <HelpIcon className="h-5 w-5 flex-none" />
            <T hi="मदद" en="Help" />
          </Link>

          {/* Only for the one person who has one, and English only: it is a
              tool, not part of the product. */}
          {viewer.isAdmin ? (
            <Link
              href="/admin"
              className="flex min-h-[52px] items-center gap-3.5 rounded-pill px-4 text-[0.98rem] font-semibold text-ink-3 transition-colors hover:bg-wash hover:text-violet"
            >
              <PencilIcon className="h-5 w-5 flex-none" />
              Catalogue
            </Link>
          ) : null}
        </nav>

        <div className="flex flex-col gap-2.5 border-t border-line pt-6">
          <span className="px-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ink-3">
            <T hi="पढ़ने की सुविधा" en="Reading comfort" />
          </span>
          <ComfortChips />
        </div>

        <div className="mt-auto border-t border-line pt-6">
          {signedIn ? (
            <Link href="/account" className="flex items-center gap-3 rounded-pill p-1.5 transition-colors hover:bg-wash">
              <span aria-hidden className="grid h-11 w-11 flex-none place-items-center rounded-pill bg-fill text-[1rem] font-semibold text-on-fill">
                {(viewer.name ?? "•").trim().charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[0.95rem] font-semibold">{viewer.name ?? "—"}</span>
                <span className="block text-[0.78rem] text-ink-3">
                  {gold ? "Kettle Gold" : <T hi="मुफ़्त" en="Free" />}
                </span>
              </span>
            </Link>
          ) : tab === "account" ? null : (
            <Link
              href="/signin"
              className="flex min-h-[52px] items-center justify-center rounded-pill bg-fill text-[0.95rem] font-semibold text-on-fill shadow-m"
            >
              <T hi="साइन इन कीजिए" en="Sign in" />
            </Link>
          )}
        </div>
      </aside>

      {/* Content column. */}
      <div className="flex min-h-dvh flex-col lg:px-10 lg:py-8">
        {/* The panel, then the content a beat later. Applied here rather than
            per page so every screen enters the same way. `enter` ends on
            transform:none, so the sticky cards inside keep working once it
            has played. */}
        {header ? <div className={cn("enter w-full lg:mx-auto", CANVAS)}>{header}</div> : null}

        {/* relative + z-10 so content pulled up with a negative margin paints above
            the gradient panel, which is positioned and would otherwise cover it. */}
        <main
          style={{ "--d": "0.09s" } as React.CSSProperties}
          className={cn(
            "enter relative z-10 flex flex-1 flex-col px-5 pb-32 lg:mx-auto lg:w-full lg:px-0 lg:pb-16",
            /*
              The gap under the panel belongs here, not to each page.

              Every screen had been setting its own — pt-6, mt-6, mt-5 lg:mt-6,
              nothing — so the first line of content sat at a different height
              on every tab, which is what made the app feel loosely assembled
              when you moved between them. One value, one place to change it.
            */
            header ? "pt-6 lg:pt-7" : "pt-5 lg:pt-0",
            CANVAS
          )}
        >
          {children}
        </main>

        {/* Tab bar, phone only. */}
        <nav
          aria-label={pick(lang, "मुख्य", "Main")}
          className="pointer-events-none sticky bottom-0 z-30 px-5 pb-[calc(14px+env(safe-area-inset-bottom))] pt-2 lg:hidden"
        >
          <div className="pointer-events-auto flex items-center gap-1 rounded-pill bg-paper p-1.5 shadow-l">
            {tabs.map(({ key, href, hi, en, Icon }) => {
              const active = tab === key;
              return (
                <Link
                  key={key}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-label={pick(lang, hi, en)}
                  className={cn(
                    "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-pill text-[0.66rem] font-semibold transition-colors",
                    active ? "bg-fill text-on-fill" : "text-ink-3 hover:text-violet"
                  )}
                >
                  <Icon className="h-5 w-5" filled={active} />
                  <span className="leading-none">
                    <T hi={hi} en={en} />
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {joiners.length > 0 ? <SocialProof joiners={joiners} /> : null}
    </div>
  );
}

/**
 * The panel at the top of a screen.
 *
 * Full bleed with a rounded bottom on a phone; a rounded card on desktop,
 * where the sidebar already frames the page. Content that should overlap it
 * is pulled up with a negative margin by the page.
 *
 * Pine by default, gold on the one screen that sells the plan. `tone` exists
 * so that screen stops hand-rolling its own panel: it did, and drifted — all
 * four corners rounded and inset, so the page showed white around a panel that
 * every other screen runs to the edge of the phone. One component owns this
 * geometry now, and a second tone is cheaper than a second panel.
 */
export function GradHeader({
  title,
  subtitle,
  eyebrow,
  back,
  action,
  children,
  tall,
  tone = "pine",
  gutter = "normal",
}: {
  /* ReactNode rather than string, so a page can pass <T hi en /> and let CSS
     choose. A string still works and is still the common case. */
  title?: ReactNode;
  subtitle?: ReactNode;
  /** A small line above the title. Used by Gold to name the plan. */
  eyebrow?: ReactNode;
  back?: { href: string; label: string };
  action?: ReactNode;
  children?: ReactNode;
  tall?: boolean;
  tone?: "pine" | "gold";
  /**
   * "narrow" trims the side padding so the panel's content can be wider. The
   * lesson stage uses it: on a phone the video is the page, and 8px a side is
   * 16px more picture.
   */
  gutter?: "normal" | "narrow";
}) {
  const gold = tone === "gold";
  return (
    <header
      className={cn(
        "relative min-h-0 rounded-b-[34px] pt-[calc(16px+env(safe-area-inset-top))] lg:min-h-[240px] lg:rounded-[26px] lg:px-9 lg:pt-8",
        gutter === "narrow" ? "px-3" : "px-5",
        gold ? "gold-surface text-on-gold" : "grad text-white",
        tall ? "pb-16" : "pb-8 lg:pb-9"
      )}
    >
      {back || action ? (
        <div className="flex min-h-[44px] items-center gap-3">
          {back ? (
            /*
              The circle is 36px; the link around it stays 44px. Tap targets
              never drop below 44px here — this audience taps with a thumb on a
              cheap screen — but the target does not have to be the drawing.
              Painting all 44px made a back arrow heavier than the title.
            */
            <Link
              href={back.href}
              aria-label={back.label}
              className="group grid h-11 w-11 flex-none place-items-center"
            >
              <span className="grid h-9 w-9 place-items-center rounded-pill bg-white/18 text-base backdrop-blur-sm transition-colors group-hover:bg-white/28">
                ←
              </span>
            </Link>
          ) : null}
          {action ? <div className="ml-auto">{action}</div> : null}
        </div>
      ) : null}

      {title || eyebrow ? (
        <div className={cn("flex flex-col gap-1.5", back || action ? "mt-3" : "mt-1")}>
          {eyebrow ? (
            <span
              className={cn(
                "text-[0.72rem] font-semibold uppercase tracking-[0.16em]",
                gold ? "text-on-gold/70" : "text-white/70"
              )}
            >
              {eyebrow}
            </span>
          ) : null}
          {title ? <h1 className="text-[1.85rem] font-bold leading-tight lg:text-[2.3rem]">{title}</h1> : null}
          {subtitle ? (
            <p
              className={cn(
                "max-w-[52ch] text-[0.95rem] leading-snug lg:text-[1.02rem]",
                gold ? "text-on-gold/80" : "text-white/80"
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}

      {children}
    </header>
  );
}
