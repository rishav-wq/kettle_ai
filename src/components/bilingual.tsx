import type { ReactNode } from "react";

/**
 * Bilingual copy.
 *
 * Renders both strings and lets CSS show one, keyed off `<html lang>`. That
 * sounds wasteful and is the reason this works at all: it needs no client
 * JavaScript, so it runs in server components, and the right language is in
 * the first byte of HTML rather than swapped in after hydration. A reader on a
 * slow connection never sees English flash to Hindi.
 *
 * The rules live in globals.css under "Bilingual copy". Hidden text stays in
 * the DOM, so it is hidden from screen readers too — hence aria-hidden on the
 * copy that is not showing.
 */
export function T({ hi, en, className }: { hi: string; en: string; className?: string }) {
  return (
    <span className={className}>
      <span lang="hi" data-lang="hi">
        {hi}
      </span>
      <span lang="en" data-lang="en">
        {en}
      </span>
    </span>
  );
}

/**
 * The same thing for copy that contains elements.
 *
 * A sentence with a link in it cannot be a pair of strings, and the link is
 * rarely in the same place in both languages — "our terms and privacy policy"
 * lands at the end of the English sentence and in the middle of the Hindi one.
 * So each language gets its own tree rather than a shared template with holes
 * in it, which is the only way word order can differ.
 */
export function TN({ hi, en, className }: { hi: ReactNode; en: ReactNode; className?: string }) {
  return (
    <span className={className}>
      <span lang="hi" data-lang="hi">
        {hi}
      </span>
      <span lang="en" data-lang="en">
        {en}
      </span>
    </span>
  );
}
