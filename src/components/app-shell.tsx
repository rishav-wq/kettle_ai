import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { withTenant } from "@/lib/db/tenant";
import { recentJoiners } from "@/lib/social-proof";
import { showsMarketing, type Viewer } from "@/lib/viewer";
import { SocialProof } from "@/components/social-proof";
import { Wordmark } from "@/components/logo";
import { ComfortChips } from "@/components/ui";
import { BookIcon, BookmarkIcon, HeartIcon, PersonIcon, StarIcon } from "@/components/icons";

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
  const joiners = showsMarketing(viewer) ? await withTenant(viewer.tenantId, (tx) => recentJoiners(tx, 6)) : [];

  const tabs = [
    { key: "learn" as const, href: "/learn", label: "Learn", Icon: BookIcon },
    { key: "mine" as const, href: "/mine", label: "My classes", Icon: BookmarkIcon },
    gold
      ? { key: "invite" as const, href: "/invite", label: "Invite", Icon: HeartIcon }
      : { key: "invite" as const, href: "/gold", label: "Gold", Icon: StarIcon },
    { key: "account" as const, href: signedIn ? "/account" : "/signin", label: signedIn ? "You" : "Sign in", Icon: PersonIcon },
  ];

  return (
    <div className="min-h-dvh bg-ground lg:grid lg:grid-cols-[268px_1fr]">
      {/* Sidebar, desktop only. */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-r border-line bg-paper px-5 py-8 lg:flex">
        {/* px-4 puts the mark on the same left edge as the nav icons below it,
            which sit inside a pill with the same padding. px-2 left it 8px
            adrift of a column it is supposed to head. */}
        <Wordmark href="/" className="px-4 text-violet" size="lg" />

        <nav className="flex flex-col gap-1.5" aria-label="Main">
          {tabs.slice(0, 3).map(({ key, href, label, Icon }) => {
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
                {label}
              </Link>
            );
          })}
          <Link
            href="/help"
            className="flex min-h-[52px] items-center gap-3.5 rounded-pill px-4 text-[0.98rem] font-semibold text-ink-3 transition-colors hover:bg-wash hover:text-violet"
          >
            <span aria-hidden className="grid h-5 w-5 flex-none place-items-center font-bold">
              ?
            </span>
            Help
          </Link>
        </nav>

        <div className="flex flex-col gap-2.5 border-t border-line pt-6">
          <span className="px-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ink-3">Reading comfort</span>
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
                <span className="block text-[0.78rem] text-ink-3">{gold ? "Kettle Gold" : "Free"}</span>
              </span>
            </Link>
          ) : (
            <Link
              href="/signin"
              className="flex min-h-[52px] items-center justify-center rounded-pill bg-fill text-[0.95rem] font-semibold text-on-fill shadow-m"
            >
              Sign in
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
            header ? "" : "pt-5 lg:pt-0",
            CANVAS
          )}
        >
          {children}
        </main>

        {/* Tab bar, phone only. */}
        <nav aria-label="Main" className="pointer-events-none sticky bottom-0 z-30 px-5 pb-[calc(14px+env(safe-area-inset-bottom))] pt-2 lg:hidden">
          <div className="pointer-events-auto flex items-center gap-1 rounded-pill bg-paper p-1.5 shadow-l">
            {tabs.map(({ key, href, label, Icon }) => {
              const active = tab === key;
              return (
                <Link
                  key={key}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                  className={cn(
                    "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-pill text-[0.66rem] font-semibold transition-colors",
                    active ? "bg-fill text-on-fill" : "text-ink-3 hover:text-violet"
                  )}
                >
                  <Icon className="h-5 w-5" filled={active} />
                  <span className="leading-none">{label}</span>
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
 * The Pine panel at the top of a screen.
 *
 * Full bleed with a rounded bottom on a phone; a rounded card on desktop,
 * where the sidebar already frames the page. Content that should overlap it
 * is pulled up with a negative margin by the page.
 */
export function GradHeader({
  title,
  subtitle,
  back,
  action,
  children,
  tall,
}: {
  title?: string;
  subtitle?: string;
  back?: { href: string; label: string };
  action?: ReactNode;
  children?: ReactNode;
  tall?: boolean;
}) {
  return (
    <header
      className={cn(
        "grad relative min-h-0 rounded-b-[34px] px-5 pt-[calc(16px+env(safe-area-inset-top))] text-white lg:min-h-[240px] lg:rounded-[26px] lg:px-9 lg:pt-8",
        tall ? "pb-16" : "pb-8 lg:pb-9"
      )}
    >
      {back || action ? (
        <div className="flex min-h-[44px] items-center gap-3">
          {back ? (
            <Link
              href={back.href}
              aria-label={back.label}
              className="grid h-11 w-11 flex-none place-items-center rounded-pill bg-white/18 text-lg backdrop-blur-sm transition-colors hover:bg-white/28"
            >
              ←
            </Link>
          ) : null}
          {action ? <div className="ml-auto">{action}</div> : null}
        </div>
      ) : null}

      {title ? (
        <div className={cn("flex flex-col gap-1.5", back || action ? "mt-3" : "mt-1")}>
          <h1 className="text-[1.85rem] font-bold leading-tight lg:text-[2.3rem]">{title}</h1>
          {subtitle ? <p className="max-w-[52ch] text-[0.95rem] leading-snug text-white/80 lg:text-[1.02rem]">{subtitle}</p> : null}
        </div>
      ) : null}

      {children}
    </header>
  );
}
