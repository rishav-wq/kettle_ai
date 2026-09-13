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

export type Faq = { q: string; a: string };

export type SiteContent = {
  contact: { whatsapp: string; hours: string };
  faq: Faq[];
};

let cached: SiteContent | null = null;

export function getSiteContent(): SiteContent {
  if (cached) return cached;
  const file = path.join(process.cwd(), "content", "kettle-site.json");
  const raw = JSON.parse(readFileSync(file, "utf8")) as Partial<SiteContent>;
  cached = {
    contact: raw.contact ?? { whatsapp: "", hours: "" },
    faq: raw.faq ?? [],
  };
  return cached;
}
