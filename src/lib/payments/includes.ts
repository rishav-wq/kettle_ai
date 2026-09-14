/*
  What Gold actually gets you.

  One list, because it was two: the Gold page and the paywall sheet each had
  their own, and they had drifted into saying different things. The sheet
  promised "cancel from the app, no phone call needed", which describes a
  subscription — there isn't one, nothing renews, and there is nothing to
  cancel. On a product whose first course teaches scam avoidance, implying a
  recurring charge is the worst possible thing to be vague about. It also
  promised "ask a question any time", which is not a feature; the WhatsApp
  helpline on /help is open to everyone, Gold or not.

  Three of these are things the code does: all lessons (viewer.ts), the twelve
  months (plan.ts), and the new-lesson notice.

  Two are not, and cannot be — they are promises Rishav keeps by hand, decided
  deliberately on 2026-09-14 after the contradiction was raised. Support is
  answered first for members and around the clock, which meant changing the
  published hours in content/kettle-site.json and on the contact page so the
  product stops disagreeing with itself. The live session is weekly, and its
  day, time and joining route live in content/kettle-site.json flagged as a
  placeholder until the first one is scheduled.

  So the old rule stands with one amendment: every line here is either
  something the code does or something written down elsewhere that someone has
  committed to doing. Nothing here is a slogan with nothing behind it.

  Its own module rather than part of plan.ts because the paywall is a client
  component, and plan.ts reads the server environment. This file imports
  nothing, so it is safe on either side.
*/
export const GOLD_INCLUDES = [
  { hi: "सारे कोर्स खुल जाते हैं", en: "Get access to all courses" },
  { hi: "12 महीने तक सब कुछ unlocked", en: "Everything unlocked for 12 months" },
  { hi: "Priority support, 24x7 — आपका सवाल पहले", en: "Priority support, 24x7 — your questions answered first" },
  { hi: "हर हफ़्ते live session, आपके सवालों के लिए", en: "A live session every week, for your questions" },
  { hi: "हर नए Gold lesson की खबर सबसे पहले", en: "First to know about every new Gold lesson" },
] as const;
