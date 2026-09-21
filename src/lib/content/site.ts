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

/**
 * Who is actually selling this.
 *
 * One block, read by all four policy pages, because these facts were repeated
 * across them and repeated facts drift: the entity name on the terms page
 * stops matching the one on the contact page, and the mismatch is exactly what
 * a payment provider's reviewer is looking for.
 *
 * Razorpay will not approve a live account without the entity name, a full
 * postal address with state and postcode, a reachable phone number and an
 * email — all publicly visible and reachable without signing in. The grievance
 * officer is India's requirement rather than Razorpay's, under the IT Rules
 * and the DPDP Act.
 *
 * `placeholder` stays true until every field is real. While it is, each page
 * renders these with a dashed border and an EXAMPLE chip, the same treatment
 * the teacher and testimonial blocks had, so a half-filled policy page cannot
 * ship unnoticed.
 */
export type Business = {
  placeholder?: boolean;
  legalName: string;
  entityType: string;
  addressLines: string[];
  city: string;
  state: string;
  postcode: string;
  country: string;
  email: string;
  phone: string;
  whatsapp: string;
  grievanceName: string;
  grievanceEmail: string;
  jurisdiction: string;
  updated: string;
};

export type SiteContent = {
  contact: { whatsapp: string; hours: string; hoursHi: string };
  faq: Faq[];
  liveSession: LiveSession | null;
  business: Business | null;
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
    business: raw.business ?? null,
  };
  return cached;
}
