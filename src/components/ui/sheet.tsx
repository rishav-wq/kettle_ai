"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

/*
  The modal. A bottom sheet on a phone, a centred dialog from sm up.

  It renders into document.body rather than where it is written, which fixes
  two things that both came from it being a DOM descendant of the Pine panel
  it is launched from.

  The panel sets text-white, and a modal inherits colour from where it sits in
  the tree no matter where it is painted — so the one line that relied on
  inherited colour, the heading, was white on a white sheet. Invisible.

  The panel also animates in, and an animation that fills forwards on transform
  keeps making a containing block after it has finished. `position: fixed`
  then resolves against the panel instead of the viewport, so the scrim covered
  only the video area and left the rest of the page bright and clickable.

  A portal ends both, and keeps ending them if someone adds a transform or a
  filter to an ancestor later.
*/

/** False while rendering on the server, true once in the browser. */
const subscribe = () => () => {};
const useMounted = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const mounted = useMounted();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      /*
        Two grounds, because a phone and a desktop are asking for different
        things here.

        On a phone the scrim is solid --paper and nothing else. Every translucent
        version was tried and every one was worse: ink at 55% over the gold hero
        mixed to a murky olive that is not a colour in this palette, and paper
        at 92% with a blur left ghost smears of the page showing through that
        read as a rendering fault. Half-seeing the page under a panel asking
        for money is busy, not layered. Solid means the strip above the sheet
        is simply the page's own white, and the sheet is the one thing on
        screen. --paper rather than white, so Night mode still darkens it.

        From sm the sheet is a centred card on a large screen, where a plain
        white void around it would read as the page having vanished. There the
        conventional dimmed overlay is right, with enough blur that the gold
        hero behind /gold becomes ground rather than a second gold panel.

        No blur on the phone: it does nothing behind an opaque layer and costs
        GPU on exactly the devices this audience owns.
      */
      className="fixed inset-0 z-50 flex items-end justify-center bg-paper sm:items-center sm:bg-ink/55 sm:p-6 sm:backdrop-blur-[10px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        /* text-ink explicitly: a dialog should never depend on what it was
           opened from for something as basic as whether its words are legible. */
        /*
          Outlined, because on a phone the ground behind it is the same white.
          shadow-l is offset downward and cannot mark a top edge, so without the
          hairline the sheet's rounded top would dissolve into the page. Large
          blocks in this product are outlined rather than filled anyway.
        */
        className="flex max-h-full w-full max-w-[520px] flex-col gap-4 overflow-y-auto rounded-t-[28px] border border-line bg-paper px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4 text-ink shadow-l sm:rounded-[28px] sm:px-7 sm:pb-7 sm:pt-6"
      >
        {/* The grab handle is a phone affordance. On a desktop dialog nobody
            drags, it just reads as a stray line. */}
        <div aria-hidden className="mx-auto mb-1 h-1.5 w-11 rounded-full bg-line sm:hidden" />
        {children}
      </div>
    </div>,
    document.body
  );
}
