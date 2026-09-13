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

export type CategoryDoc = {
  id: string; // slug
  nameHi: string;
  nameEn: string;
  sortOrder: number;
};

export type VideoAssetDoc = {
  id: string;
  provider: VideoProvider;
  /** For YouTube the video id. For signed providers, the playback id. */
  providerRef: string;
  durationSec: number;
};

export type CourseDoc = {
  id: string; // slug
  /** Null means global content, visible to every tenant. */
  tenantId: string | null;
  categoryId: string;
  titleHi: string;
  titleEn: string;
  descriptionHi: string | null;
  descriptionEn: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isPublished: boolean;
};

export type LessonDoc = {
  id: string; // slug
  courseId: string;
  sortOrder: number;
  titleHi: string;
  titleEn: string;
  videoAssetId: string | null;
  transcriptHi: string | null;
  transcriptEn: string | null;
  /** Exactly four lessons carry this. They are the whole top of the funnel. */
  isFree: boolean;
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
