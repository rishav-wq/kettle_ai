import "server-only";

/*
  The data model, as MongoDB documents.

  A direct translation of the Postgres schema it replaces, keeping the same
  field names, the same nullability, and the same meanings, so that everything
  above the data layer reads as it did before.

  Two deliberate choices:

  `id` stays an ordinary field rather than becoming `_id`. Mongo assigns its
  own `_id` and we ignore it. That costs one extra index per collection and
  saves rewriting every `row.id` in the app — and more to the point, it removes
  a whole class of silent porting bug where an id is read from the wrong key.

  Timestamps are real Date objects, as Drizzle returned. Anything that was
  `timestamp with time zone` is a Date; anything nullable is `Date | null`,
  not optional, so a missing value has to be written deliberately.
*/

export type Lang = "hi" | "en";
export type TenantType = "individual" | "organization";
export type VideoProvider = "youtube" | "bunny" | "cloudflare";
export type MemberRole = "learner" | "org_admin" | "content_admin" | "super_admin";
export type MembershipStatus = "pending" | "active" | "expired" | "refunded";
export type PaymentStatus = "created" | "paid" | "failed" | "refunded";
export type SmsStatus = "queued" | "delivered" | "failed" | "unknown";

export type TenantDoc = {
  id: string; // slug; "public" for consumers
  name: string;
  type: TenantType;
  createdAt: Date;
};

/**
 * A category, and now the only thing a lesson belongs to.
 *
 * Courses used to sit between the two. They were removed because in eight of
 * the eleven filled categories there was exactly one course, so the layer was
 * a tap to a page that repeated the category under a near-identical name — in
 * "Start with AI" it was the same name exactly. Two levels is also simply
 * right for the audience: a category, then a five minute video.
 *
 * What the course carried and the category now carries: a description, and a
 * published flag that has moved down to the lesson, where it belongs — a
 * lesson with no video yet is the thing that should stay hidden, not a whole
 * group of them.
 */
export type CategoryDoc = {
  id: string; // slug
  /** Null means global content, visible to every tenant. */
  tenantId: string | null;
  nameHi: string;
  nameEn: string;
  /**
   * One line under the heading, where the name alone does not say who the
   * category is for. Optional on purpose: most categories are self-evident and
   * a line of explanation under every one of seventeen headings is noise.
   */
  blurbHi?: string | null;
  blurbEn?: string | null;
  /** The longer text, shown at the top of the category's own page. */
  descriptionHi?: string | null;
  descriptionEn?: string | null;
  sortOrder: number;
};

export type VideoAssetDoc = {
  id: string;
  provider: VideoProvider;
  /** For YouTube the video id. For signed providers, the playback id. */
  providerRef: string;
  durationSec: number;
  /**
   * Which way up the video was shot.
   *
   * These are filmed on a phone and watched on a phone, so most are portrait.
   * The stage used to be 16:9 for everything, which letterboxed a 9:16 video
   * into a thin strip with black down both sides — the video occupied about a
   * third of the box it was given.
   *
   * Optional, defaulting to landscape, so an asset written before this field
   * existed still renders the way it always did.
   */
  orientation?: "landscape" | "portrait";
};

/*
  CourseDoc used to be here. Lessons hang off a category directly now; see the
  note on CategoryDoc. scripts/flatten-courses.ts performed the migration and
  can be deleted once no database needs it.
*/

export type LessonDoc = {
  id: string; // slug
  categoryId: string;
  sortOrder: number;
  titleHi: string;
  titleEn: string;
  videoAssetId: string | null;
  transcriptHi: string | null;
  transcriptEn: string | null;
  /** Exactly four lessons carry this. They are the whole top of the funnel. */
  isFree: boolean;
  /**
   * Off by default, so a lesson typed into the editor before its video exists
   * is not on the Learn page while it is being written. Inherited from the
   * course when courses were flattened away.
   */
  isPublished: boolean;
  /**
   * Card art. Usually null: the YouTube thumbnail is used when there is a real
   * video, which is a frame of the actual lesson rather than stock
   * illustration. This is the override, and the fallback while a video is TODO.
   */
  imageUrl: string | null;
};

export type UserDoc = {
  id: string;
  tenantId: string;
  /** E.164. The login identity, unique within a tenant. */
  phone: string;
  name: string | null;
  lang: Lang;
  preferredCategoryId: string | null;
  city: string | null;
  consentAt: Date | null;
  onboardedAt: Date | null;
  referredByCode: string | null;
  /** Set once the referral bonus is paid, so it can never pay twice. */
  referralRewardedAt: Date | null;
  whatsappOptIn: boolean;
  createdAt: Date;
  lastSeenAt: Date | null;
};

export type TenantMemberDoc = {
  tenantId: string;
  userId: string;
  role: MemberRole;
  createdAt: Date;
};

export type MembershipDoc = {
  id: string;
  tenantId: string;
  userId: string;
  /** Who paid. Same as userId today; differs once gifting exists. */
  payerUserId: string | null;
  status: MembershipStatus;
  validFrom: Date | null;
  validUntil: Date | null;
  createdAt: Date;
};

export type PaymentDoc = {
  id: string;
  tenantId: string;
  /* Both links are nullable so deleting an account can sever the personal
     connection while the financial record survives — what accounting needs
     and what the right to erasure allows. */
  membershipId: string | null;
  userId: string | null;
  amountPaise: number;
  /** Our idempotency key, sent to Razorpay as the receipt. */
  receipt: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  status: PaymentStatus;
  createdAt: Date;
  paidAt: Date | null;
};

export type ProgressDoc = {
  tenantId: string;
  userId: string;
  lessonId: string;
  watchedSec: number;
  completedAt: Date | null;
  updatedAt: Date;
};

/** One document per free lesson a free user completes. Drives the paywall. */
export type FreeWatchDoc = {
  tenantId: string;
  userId: string;
  lessonId: string;
  completedAt: Date;
};

export type ReferralCodeDoc = {
  code: string;
  tenantId: string;
  userId: string;
  createdAt: Date;
};

/** Fixed-window counters, keyed "scope:subject". */
export type RateLimitDoc = {
  key: string;
  windowStart: Date;
  count: number;
};

/** Append only. Nothing in the app updates or deletes one of these. */
export type AuditDoc = {
  id: string;
  tenantId: string;
  actorUserId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ip: string | null;
  meta: string | null; // small JSON string
  createdAt: Date;
};

/*
  Auth primitives. No tenant: a challenge exists before anyone is signed in,
  and a session has to be read before the tenant is known.
*/

export type OtpChallengeDoc = {
  phone: string;
  /** HMAC of the code keyed by AUTH_SECRET. A dump alone yields nothing usable. */
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  referredByCode: string | null;
  createdAt: Date;
};

export type SessionDoc = {
  /** SHA-256 of the cookie value. The cookie itself is never stored. */
  tokenHash: string;
  userId: string;
  tenantId: string;
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date;
};

export type SmsDeliveryDoc = {
  id: string;
  provider: string;
  providerMessageId: string | null;
  phone: string;
  purpose: string;
  status: SmsStatus;
  providerStatus: string | null;
  sentAt: Date;
  reportedAt: Date | null;
};
