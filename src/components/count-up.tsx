"use client";

import { useEffect, useRef, useState } from "react";

/*
  A number that counts up to itself when it first comes into view.

  The number it lands on is the real one, passed in from the database — this
  animates the reveal, it does not invent the figure. On a product that teaches
  people to distrust inflated claims, that distinction is the whole reason this
  component takes a value rather than a target.

  The final value is rendered on the server and is what a reader without
  JavaScript, or with reduced motion asked for, sees immediately. Nothing here
  is load-bearing.
*/
export function CountUp({ value, durationMs = 900 }: { value: number; durationMs?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (still || typeof IntersectionObserver === "undefined" || value <= 1) return;

    let frame = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        // Ease out: fast first, settling onto the real number rather than
        // snapping to it.
        setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      setShown(0);
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        run();
      },
      { threshold: 0.4 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} suppressHydrationWarning>
      {shown}
    </span>
  );
}
