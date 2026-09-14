import "server-only";
import { cookies } from "next/headers";

/*
  Which language the interface is in.

  Kept in a cookie rather than only on the user, because the choice has to work
  before anyone signs in — the landing page is where most people will make it,
  and asking someone to create an account to read the site in their own
  language would be absurd.

  For a signed-in person the same value is mirrored onto users.lang at
  onboarding and from the account screen, so it follows them to a new phone.
  The cookie still wins for the current device: it is what they last chose
  here, and a stale preference from another device should not override a
  deliberate tap.

  Deliberately not httpOnly. It is a display preference, the toggle sets it
  from the browser, and nothing about access depends on it.
*/

import type { Lang } from "@/lib/pick";
export type { Lang } from "@/lib/pick";

export const LANG_COOKIE = "kettle_lang";
export const LANG_MAX_AGE = 60 * 60 * 24 * 365;

/** The interface language for this request. English unless asked otherwise. */
export async function getLang(): Promise<Lang> {
  const jar = await cookies();
  return jar.get(LANG_COOKIE)?.value === "hi" ? "hi" : "en";
}

/**
 * Records a language choice for this device.
 *
 * Shared by the toggle's server action and the onboarding route so both write
 * the same cookie with the same lifetime. Route handlers and server actions may
 * both write cookies; server components may not, which is why the toggle is a
 * form rather than a link.
 */
export async function setLangCookie(lang: Lang): Promise<void> {
  const jar = await cookies();
  jar.set(LANG_COOKIE, lang, { path: "/", maxAge: LANG_MAX_AGE, sameSite: "lax" });
}
