"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Lang } from "@/lib/pick";

/*
  The interface language, for the few things CSS cannot switch.

  Almost all copy goes through <T hi en />, which renders both and lets CSS
  hide one — no JavaScript, works in server components, right language in the
  first byte. But an attribute is not an element: placeholder, aria-label and
  alt hold one string and cannot be hidden selectively. Those need the value.

  Server components read it with getLang(). Client components read it here,
  from a provider set once in the root layout, rather than having lang threaded
  through six levels of props to reach an OTP box.

  The default is English, so a component rendered outside the provider — a
  test, the component kit — still produces something readable.
*/
const LangContext = createContext<Lang>("en");

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext value={lang}>{children}</LangContext>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

