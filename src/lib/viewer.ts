import "server-only";
import { cache } from "react";
import { PUBLIC_TENANT, withTenant } from "@/lib/db/scope";
import type { FreeWatchDoc, MembershipDoc, UserDoc } from "@/lib/db/documents";
import { readSession } from "@/lib/auth/session";

/*
  Viewer state is the spine of the app.

  Every screen, popup, and video decision is a function of one of three states.
  It is resolved once per request on the server and passed down. No page decides
  access on its own, and nothing here is ever taken from the client.

    anonymous  - not signed in. Watches the free lessons, nothing else.
    free       - signed in, no membership. Free lessons until the limit, then the paywall.
    gold       - active membership. Everything unlocked, no marketing.
*/

export type ViewerState = "anonymous" | "free" | "gold";
export type Lang = "hi" | "en";

export type Viewer = {
  state: ViewerState;
  tenantId: string;
  userId: string | null;
  name: string | null;
  lang: Lang;
  /** Distinct free lessons completed. Drives the paywall after the fourth. */
  freeWatched: number;
  /** False until onboarding finishes. The app routes new users there. */
  onboarded: boolean;
  /** When the membership lapses. Null unless gold. */
  goldUntil: Date | null;
  /** From onboarding. Puts that category first on the Learn page. */
  preferredCategoryId: string | null;
};

/** How many free lessons a signed-in viewer gets before the paywall. */
export const FREE_LESSON_LIMIT = 4;

export const ANONYMOUS: Viewer = {
  state: "anonymous",
  tenantId: PUBLIC_TENANT,
  userId: null,
  name: null,
  lang: "hi",
  freeWatched: 0,
  onboarded: false,
  goldUntil: null,
  preferredCategoryId: null,
};

/**
 * Resolves the viewer for this request. Cached per request, so calling it in a
 * layout and again in a page costs one round trip, not two.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const session = await readSession();
  if (!session) return ANONYMOUS;

  return withTenant(session.tenantId, async (db) => {
    const user = await db.findOne<UserDoc>("users", { id: session.userId });

    // The session outlived the user, which means the account was deleted.
    if (!user) return ANONYMOUS;

    // The furthest-future active membership decides gold, so a referral bonus
    // that opened a second one cannot shorten the answer.
    const [gold] = await db.find<MembershipDoc>(
      "memberships",
      { userId: user.id, status: "active", validUntil: { $gt: new Date() } },
      { sort: { validUntil: -1 }, limit: 1 }
    );

    const watched = await db.countDocuments<FreeWatchDoc>("free_watch_log", { userId: user.id });

    return {
      state: gold ? ("gold" as const) : ("free" as const),
      tenantId: session.tenantId,
      userId: user.id,
      name: user.name,
      lang: user.lang,
      freeWatched: watched,
      onboarded: user.onboardedAt !== null,
      goldUntil: gold?.validUntil ?? null,
      preferredCategoryId: user.preferredCategoryId,
    };
  });
});

/** May this viewer watch this lesson right now? */
export function canWatch(viewer: Viewer, lesson: { isFree: boolean }): boolean {
  if (viewer.state === "gold") return true;
  if (!lesson.isFree) return false;
  // An anonymous visitor can watch the free lessons; the counter only starts at sign in.
  if (viewer.state === "anonymous") return true;
  return viewer.freeWatched < FREE_LESSON_LIMIT;
}

/** Why a lesson is not watchable, so the paywall can say the right thing. */
export type LockReason = "locked_lesson" | "free_limit_reached";

export function lockReason(viewer: Viewer, lesson: { isFree: boolean }): LockReason | null {
  if (canWatch(viewer, lesson)) return null;
  return lesson.isFree ? "free_limit_reached" : "locked_lesson";
}

/** Social proof and gold prompts show only to signed-in free users. */
export function showsMarketing(viewer: Viewer): boolean {
  return viewer.state === "free";
}

/** Invite is gold-only. Free viewers get the unlock page at the same route. */
export function hasInvite(viewer: Viewer): boolean {
  return viewer.state === "gold";
}

/** Free lessons left before the paywall. Shown honestly rather than as a surprise. */
export function freeLeft(viewer: Viewer): number {
  if (viewer.state !== "free") return 0;
  return Math.max(0, FREE_LESSON_LIMIT - viewer.freeWatched);
}
