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
        The scrim has to do more work on /gold than anywhere else, because the
        page behind it is itself a gold panel and the sheet opens another one.
        Two gold surfaces at similar strength read as one repeated by mistake.
        A 2px blur left the one behind perfectly legible; at 10px it becomes
        ground and the sheet becomes the subject.

        Paper rather than ink. A dark scrim over the gold hero turned the strip
        above the sheet a murky olive — not a colour in this palette, and the
        first thing on screen above a panel asking for money. Tinting toward the
        page's own ground keeps that strip the same white as the sheet, so the
        sheet reads as the page lifting rather than as a window cut into a dim
        overlay. It is --paper, not white, so Night mode still darkens.

        The sheet is the same token, so the edge between them is carried by
        shadow-l alone, and at 92 there is almost nothing behind to see. That is
        deliberate: a partly-visible page under a panel asking for money is busy
        rather than layered, and this audience is better served by one thing on
        screen at a time. The shadow is what keeps the sheet a sheet.
      */
      className="fixed inset-0 z-50 flex items-end justify-center bg-paper/92 backdrop-blur-[14px] sm:items-center sm:p-6"
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
        className="flex max-h-full w-full max-w-[520px] flex-col gap-4 overflow-y-auto rounded-t-[28px] bg-paper px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4 text-ink shadow-l sm:rounded-[28px] sm:px-7 sm:pb-7 sm:pt-6"
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
