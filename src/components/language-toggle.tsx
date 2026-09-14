"use client";

import { setLang } from "@/app/actions/lang";
import type { Lang } from "@/lib/lang";
import { cn } from "@/lib/cn";

/*
  The language switch.

  Two words, each written in its own script, so the choice is legible to
  someone who cannot read the other one. "हिंदी" rather than "Hindi" is the
  whole point: a reader who only reads Devanagari has to be able to find it.

  A form posting to a server action rather than a click handler, so it still
  works with no JavaScript. On a weak connection the language switch is exactly
  the control someone needs before the bundle arrives, if the page has loaded in
  a script they cannot read.
*/

const OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी" },
] as const;

export function LanguageToggle({
  current,
  tone = "light",
  className,
}: {
  current: Lang;
  tone?: "light" | "onGrad";
  className?: string;
}) {
  return (
    <form
      action={setLang}
      aria-label={current === "hi" ? "भाषा" : "Language"}
      className={cn("flex flex-none items-center gap-0.5 rounded-pill p-0.5", tone === "onGrad" ? "bg-white/15" : "bg-wash", className)}
    >
      {OPTIONS.map((o) => {
        const active = o.value === current;
        return (
          <button
            key={o.value}
            type="submit"
            name="lang"
            value={o.value}
            aria-pressed={active}
            className={cn(
              "min-h-[36px] rounded-pill px-3 text-[0.82rem] font-semibold transition-colors",
              active
                ? tone === "onGrad"
                  ? "bg-white text-violet"
                  : "bg-fill text-on-fill"
                : tone === "onGrad"
                  ? "text-white/80 hover:text-white"
                  : "text-ink-3 hover:text-violet"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </form>
  );
}
