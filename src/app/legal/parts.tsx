import type { ReactNode } from "react";

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

export function UL({ items }: { items: string[] }) {
  return (
    <ul className="flex max-w-[62ch] flex-col gap-2.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3 text-[0.96rem] leading-relaxed text-ink-2">
          <span aria-hidden className="mt-[0.55em] h-1.5 w-1.5 flex-none rounded-full bg-violet" />
          {t}
        </li>
      ))}
    </ul>
  );
}
