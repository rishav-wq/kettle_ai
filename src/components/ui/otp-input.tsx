"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";
import { useLang } from "@/components/lang-provider";
import { pick } from "@/lib/pick";

/**
 * Six large boxes over one hidden input.
 *
 * Typing, pasting and SMS autofill all land in the real input; the boxes are
 * display only. Far more robust on Indian Android keyboards than six separate
 * inputs, which fight autofill and lose focus between characters.
 */
export function OtpInput({ length = 6, value, onChange, disabled }: { length?: number; value: string; onChange: (next: string) => void; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const useLangValue = useLang();
  const digits = value.replace(/\D/g, "").slice(0, length);

  return (
    <div className="relative">
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={length}
        value={digits}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
        aria-label={pick(useLangValue, "SMS से आया code", "Code from SMS")}
        className="self-ring absolute inset-0 z-[1] w-full opacity-0"
      />
      <div className="flex gap-2" aria-hidden onClick={() => ref.current?.focus()}>
        {Array.from({ length }).map((_, i) => {
          const filled = i < digits.length;
          const current = i === digits.length;
          return (
            <span
              key={i}
              className={cn(
                "grid h-[62px] flex-1 place-items-center rounded-tile text-[1.4rem] font-semibold tabular-nums transition-colors",
                /*
                  An empty box needs its own outline. These were bg-wash with
                  no border, and the sign-in card sits on wash — so six
                  invisible squares, and no way to tell how many digits were
                  expected or how many had been typed.
                */
                filled
                  ? "bg-paper text-ink shadow-s ring-2 ring-violet"
                  : current
                    ? "bg-paper text-ink-3 shadow-s ring-2 ring-violet"
                    : "border border-line bg-paper text-ink-3"
              )}
            >
              {filled ? digits[i] : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}
