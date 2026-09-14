import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

/*
  Landing page content that is not course data: how to reach us, and the
  answers to the objections a suspicious buyer actually has.

  Teacher and testimonial blocks used to live here as flagged placeholders.
  They were removed rather than filled: a section that needs a real person and
  a real photograph is better absent than pending, and a fabricated learner
  quote would make the product an instance of the thing its first course warns
  about. Add them back when there are real people to put in them.
*/

/* Hindi is optional so an unanswered question still renders; it falls back to
   the English, which is better than an empty accordion. */
export type Faq = { q: string; a: string; qHi?: string; aHi?: string };

/**
 * The weekly live session, sold on the Gold page.
 *
 * `placeholder` marks it as not yet real. While it is set, the details render
 * with a dashed border and an EXAMPLE chip so the block cannot ship unnoticed —
 * the same treatment the teacher and testimonial blocks had. Fill `when` and
 * `howToJoin` with the real day, time and route to the link, then drop the flag.
 */
export type LiveSession = {
  placeholder?: boolean;
  when: string;
  whenHi: string;
  howToJoin: string;
  howToJoinHi: string;
};

export type SiteContent = {
  contact: { whatsapp: string; hours: string; hoursHi: string };
  faq: Faq[];
  liveSession: LiveSession | null;
};

let cached: SiteContent | null = null;

export function getSiteContent(): SiteContent {
  if (cached) return cached;
  const file = path.join(process.cwd(), "content", "kettle-site.json");
  const raw = JSON.parse(readFileSync(file, "utf8")) as Partial<SiteContent>;
  cached = {
    contact: raw.contact ?? { whatsapp: "", hours: "", hoursHi: "" },
    faq: raw.faq ?? [],
    liveSession: raw.liveSession ?? null,
  };
  return cached;
}
