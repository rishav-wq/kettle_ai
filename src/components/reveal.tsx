"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/*
  Reveal on scroll.

  One observer per element, disconnected the moment it fires: this is an
  entrance, not a state, so nothing should re-hide when you scroll back up. A
  section that has been read stays read.

  The 12% threshold with a negative bottom margin means the animation starts
  once a section is genuinely on its way in, rather than the instant its top
  pixel clears the fold, which reads as a twitch on a tall phone.
*/
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  /** Seconds of stagger, for items revealed as a group. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No observer to lean on: show it rather than leave it hidden. Deferred by
    // a tick because React does not allow setting state in an effect body.
    if (typeof IntersectionObserver === "undefined") {
      const t = window.setTimeout(() => setShown(true), 0);
      return () => window.clearTimeout(t);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setShown(true);
        observer.disconnect();
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal=""
      data-shown={shown}
      style={delay ? ({ "--d": `${delay}s` } as React.CSSProperties) : undefined}
      className={className}
    >
      {children}
    </div>
  );
}
