"use client";

import { useEffect, useState } from "react";

export type JoinerView = { firstName: string; city: string | null; daysAgo: number };

/*
  Recent joiners, shown to signed-in free viewers only.

  Every name is a real membership read from the database. The time is stated
  honestly as today, yesterday, or N days ago, never "just now" when it was
  not. A product that teaches people to spot fabricated urgency cannot use it.

  At most three per visit, one every 25 seconds, none within 30 minutes of the
  last on this device. Dismissing stops them for the visit.
*/

const KEY = "kettle.proof.last";
const COOLDOWN_MS = 30 * 60 * 1000;
const FIRST_DELAY_MS = 8_000;
const GAP_MS = 25_000;
const VISIBLE_MS = 7_000;
const MAX_PER_LOAD = 3;

export function SocialProof({ joiners }: { joiners: JoinerView[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (joiners.length === 0 || typeof window === "undefined") return;

    let last = 0;
    try {
      last = Number(localStorage.getItem(KEY) ?? 0);
    } catch {}
    if (Date.now() - last < COOLDOWN_MS) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const count = Math.min(MAX_PER_LOAD, joiners.length);

    for (let i = 0; i < count; i++) {
      const showAt = FIRST_DELAY_MS + i * GAP_MS;
      timers.push(
        setTimeout(() => {
          setIndex(i);
          if (i === 0) {
            try {
              localStorage.setItem(KEY, String(Date.now()));
            } catch {}
          }
        }, showAt)
      );
      timers.push(setTimeout(() => setIndex((cur) => (cur === i ? null : cur)), showAt + VISIBLE_MS));
    }
    return () => timers.forEach(clearTimeout);
  }, [joiners]);

  if (dismissed || index === null) return null;
  const j = joiners[index];
  if (!j) return null;

  const when = j.daysAgo === 0 ? "today" : j.daysAgo === 1 ? "yesterday" : `${j.daysAgo} days ago`;
  const who = j.city ? `${j.firstName} from ${j.city}` : j.firstName;

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom))] z-40 flex justify-center px-5">
      <div className="pointer-events-auto flex w-full max-w-[480px] items-center gap-3 rounded-pill bg-paper py-2 pl-2 pr-1 shadow-l">
        <span aria-hidden className="grid h-10 w-10 flex-none place-items-center rounded-pill bg-wash text-[0.95rem] font-semibold text-violet">
          {j.firstName.charAt(0)}
        </span>
        <p className="min-w-0 flex-1 truncate text-[0.88rem] font-medium">
          {who} joined Gold {when}
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="grid h-10 w-10 flex-none place-items-center rounded-pill text-[1.1rem] text-ink-3 hover:bg-wash hover:text-ink"
        >
          ×
        </button>
      </div>
    </div>
  );
}
