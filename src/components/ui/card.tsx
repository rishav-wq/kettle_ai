import Link from "next/link";
import type { ReactNode } from "react";
import { LockIcon } from "@/components/icons";
import { T } from "@/components/bilingual";
import { cn } from "@/lib/cn";

/*
  The white card is the unit this design is built from.

  A pink rule above the title is the recurring mark, borrowed from the
  reference: it tells you where a card's content starts without needing a
  heavier border.
*/

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-card border border-line bg-paper shadow-s", className)}>{children}</div>;
}

export function CardLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      /* A card that goes somewhere lifts a little under the pointer. Three
         pixels: enough to answer "is this clickable", not enough to shift the
         row around it. Touch devices never hover, so they only see the press. */
      className={cn(
        "group block rounded-card border border-line bg-paper shadow-s transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-m active:translate-y-0 active:scale-[0.99]",
        className
      )}
    >
      {children}
    </Link>
  );
}

/** The short pink rule that sits above a card title. */
export function Rule({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block h-[3px] w-6 rounded-full bg-pink", className)} />;
}

/** A lesson or category tile: illustration, rule, title, one line of meta. */
export function Tile({
  href,
  image,
  title,
  meta,
  badge,
  locked,
  className,
}: {
  href: string;
  image?: string;
  /* ReactNode, so a caller can pass <T hi en /> and let CSS pick. Titles are
     bilingual in the database; rendering only titleEn threw half of that
     away. */
  title: ReactNode;
  meta: ReactNode;
  badge?: ReactNode;
  /**
   * This viewer cannot open this lesson yet.
   *
   * The padlock is always drawn, not revealed on hover. Most of this audience
   * is on a phone, where there is no hover at all, so a hover-only lock would
   * be invisible to the people it is for. Hover adds a scrim and the word Gold
   * on the machines that have a pointer; it is not what carries the meaning.
   */
  locked?: boolean;
  className?: string;
}) {
  return (
    <CardLink href={href} className={cn("overflow-hidden", className)}>
      <div className="relative aspect-[4/3] bg-wash">
        {image ? (
          /* Our own static SVGs, a few hundred bytes each, so they skip the optimiser. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            aria-hidden
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
            decoding="async"
          />
        ) : null}
        {locked ? (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-ink/0 transition-colors duration-200 group-hover:bg-ink/30"
            />
            <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-pill bg-ink/75 px-2 py-1 text-[0.7rem] font-semibold text-white backdrop-blur-sm">
              <LockIcon className="h-3.5 w-3.5" />
              <span className="hidden group-hover:inline">Gold</span>
              <span className="sr-only">
                <T hi="सिर्फ़ Gold सदस्यों के लिए" en="Gold members only" />
              </span>
            </span>
          </>
        ) : null}
        {badge ? (
          <span className="absolute left-3 top-3 rounded-pill bg-white/95 px-2.5 py-1 text-[0.7rem] font-semibold text-violet shadow-s">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5 p-4">
        <Rule />
        <span className="mt-0.5 block text-[0.98rem] font-semibold leading-snug text-ink">{title}</span>
        <span className="block text-[0.8rem] leading-snug text-ink-3">{meta}</span>
      </div>
    </CardLink>
  );
}
