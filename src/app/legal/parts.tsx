import type { ReactNode } from "react";
import { T } from "@/components/bilingual";

/** Shared typography for the policy pages, so they read as one document. */

export function H1({ children }: { children: ReactNode }) {
  return <h1 className="text-[1.7rem] font-bold leading-tight">{children}</h1>;
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-5 text-[1.1rem] font-bold leading-snug">{children}</h2>;
}

export function P({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <p className={`max-w-[62ch] leading-relaxed ${muted ? "text-[0.88rem] text-ink-3" : "text-[0.96rem] text-ink-2"}`}>{children}</p>;
}

/** A list of bilingual points. Each item is the same point in both languages. */
export function UL({ items }: { items: readonly { hi: string; en: string }[] }) {
  return (
    <ul className="flex max-w-[62ch] flex-col gap-2.5">
      {items.map((t) => (
        <li key={t.en} className="flex gap-3 text-[0.96rem] leading-relaxed text-ink-2">
          <span aria-hidden className="mt-[0.55em] h-1.5 w-1.5 flex-none rounded-full bg-violet" />
          <T hi={t.hi} en={t.en} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Which version wins.
 *
 * A translated policy that does not say this is worse than none: two texts
 * with equal standing and no rule for disagreement is exactly the ambiguity a
 * policy exists to remove.
 */
export function Governing() {
  return (
    <P muted>
      <T
        hi="यह हिंदी रूपांतर समझने की सुविधा के लिए है। किसी मतभेद की स्थिति में अंग्रेज़ी पाठ मान्य होगा।"
        en="This Hindi version is provided for ease of understanding. If the two ever disagree, the English text governs."
      />
    </P>
  );
}
