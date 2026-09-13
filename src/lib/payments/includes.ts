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

  Every line here is something the code actually does, so keep it that way:
  all lessons (viewer.ts), progress across devices (progress.ts), no marketing
  popups for members (showsMarketing), and the referral month (referral.ts).

  Its own module rather than part of plan.ts because the paywall is a client
  component, and plan.ts reads the server environment. This file imports
  nothing, so it is safe on either side.
*/
export const GOLD_INCLUDES = [
  "Every lesson in every course",
  "Pick up where you left, on any phone",
  "No adverts, no popups",
  "Invite a friend and you both get an extra month",
] as const;
