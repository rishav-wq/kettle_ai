/*
  The interface language, and how to pick one string of a pair.

  Deliberately in its own module with no "use client" and no "server-only":
  both halves of the app need it. `pick` first lived in lang-provider.tsx, which
  is a client module — so every server component that called it type-checked,
  built, and then threw "Attempted to call pick() from the server" at request
  time. A shared value belongs in a file that has taken no side.
*/

export type Lang = "hi" | "en";

/**
 * Picks one of a pair. The counterpart to `<T>` for attribute strings.
 *
 * `<T>` renders both languages and lets CSS hide one, which is why it needs no
 * language at all. An attribute holds a single string and cannot be hidden
 * selectively, so placeholder, aria-label and alt have to choose.
 */
export function pick(lang: Lang, hi: string, en: string): string {
  return lang === "hi" ? hi : en;
}
