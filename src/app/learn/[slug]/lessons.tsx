"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button, LessonRow } from "@/components/ui";
import { Paywall } from "@/components/paywall";
import type { LockReason } from "@/lib/viewer";

export type LessonRowData = {
  id: string;
  index: number;
  title: ReactNode;
  meta: ReactNode;
  progress: number;
  done: boolean;
  current: boolean;
  /** Null when the viewer may watch it. */
  lockedBecause: LockReason | null;
};

/*
  The lesson list, with the paywall attached.

  A locked lesson used to be a link to its own page, which then opened the
  paywall over a video that was never going to play. That is a wasted
  navigation and a small deception: the page presents itself as the lesson and
  turns out to be a shop. Here the row is a button, the sheet opens over the
  list, and "Not now" leaves the reader exactly where they were, looking at the
  other lessons.

  The lesson page still refuses a locked lesson on its own. Someone can type
  the URL, and entitlement is not a navigation decision.
*/
export function CategoryLessons({
  rows,
  months,
  price,
  listPrice,
  ready,
  coming,
  signedIn,
}: {
  rows: LessonRowData[];
  months: number;
  price: string;
  listPrice: string | null;
  ready: number;
  coming: number;
  signedIn: boolean;
}) {
  const [reason, setReason] = useState<LockReason | null>(null);

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <LessonRow
            key={r.id}
            index={r.index}
            title={r.title}
            meta={r.meta}
            progress={r.progress}
            done={r.done}
            current={r.current}
            locked={r.lockedBecause !== null}
            href={r.lockedBecause ? undefined : `/lessons/${r.id}`}
            onClick={r.lockedBecause ? () => setReason(r.lockedBecause) : undefined}
          />
        ))}
      </div>

      <Paywall
        open={reason !== null}
        onClose={() => setReason(null)}
        reason={reason ?? "locked_lesson"}
        months={months}
        price={price}
        listPrice={listPrice}
        ready={ready}
        coming={coming}
        signedIn={signedIn}
      />
    </>
  );
}

/*
  The big button under the list.

  Same rule as a row: if the lesson it points at is locked, it must not
  pretend to be a way in. A free viewer looking at a paid category would
  otherwise be sent to a player that opens a shop.
*/
export function StartLessonCta({
  href,
  label,
  lockedBecause,
  months,
  price,
  listPrice,
  ready,
  coming,
  signedIn,
  className,
}: {
  href: string;
  /* Visible text, so it arrives as <T hi en /> and CSS picks. */
  label: ReactNode;
  lockedBecause: LockReason | null;
  months: number;
  price: string;
  listPrice: string | null;
  ready: number;
  coming: number;
  signedIn: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!lockedBecause) {
    return (
      <Button href={href} size="lg" full className={className}>
        {label}
      </Button>
    );
  }

  return (
    <>
      <Button size="lg" full className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Paywall open={open} onClose={() => setOpen(false)} reason={lockedBecause} months={months} price={price} listPrice={listPrice} ready={ready} coming={coming} signedIn={signedIn} />
    </>
  );
}

/*
  The play control in the panel. Third way into a lesson, same rule as the
  other two: locked means it opens the sheet, not the player.
*/
export function ResumePlayButton({
  href,
  label,
  lockedBecause,
  months,
  price,
  listPrice,
  ready,
  coming,
  signedIn,
  children,
  className,
}: {
  href: string;
  label: string;
  lockedBecause: LockReason | null;
  months: number;
  price: string;
  listPrice: string | null;
  ready: number;
  coming: number;
  signedIn: boolean;
  children: React.ReactNode;
  className: string;
}) {
  const [open, setOpen] = useState(false);

  if (!lockedBecause) {
    return (
      <Link href={href} aria-label={label} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <button type="button" aria-label={`${label} — Kettle Gold`} onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <Paywall open={open} onClose={() => setOpen(false)} reason={lockedBecause} months={months} price={price} listPrice={listPrice} ready={ready} coming={coming} signedIn={signedIn} />
    </>
  );
}
