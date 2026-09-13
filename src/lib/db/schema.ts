import { sql } from "drizzle-orm";
import {
  pgTable,
  pgPolicy,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/*
  Tenancy
  ------------------------------------------------------------------
  Shared database, row-level isolation. Every person-scoped table carries
  tenant_id. Consumers live in the "public" tenant; an organisation (a senior
  centre, a corporate wellness program) gets its own tenant later without a
  schema change.

  Isolation is enforced twice:
    1. Application layer. Every query runs inside withTenant(), which opens a
       transaction and sets app.tenant_id. See src/lib/db/tenant.ts.
    2. Database layer. Row-level security policies below reject rows whose
       tenant_id does not match app.tenant_id, even if application code has a bug.
       A custom migration FORCEs RLS so the table owner is not exempt.

  Content (categories, courses, lessons, video assets) is global unless a
  course carries a tenant_id, in which case only that tenant sees it.
*/

export const PUBLIC_TENANT = "public";

/** current_setting(..., true) returns NULL instead of erroring when unset, which fails closed. */
const currentTenant = sql`current_setting('app.tenant_id', true)`;
const bypass = sql`current_setting('app.bypass_rls', true) = 'on'`;

function tenantPolicy(name: string) {
  return pgPolicy(name, {
    as: "permissive",
    for: "all",
    using: sql`${bypass} OR tenant_id = ${currentTenant}`,
    withCheck: sql`${bypass} OR tenant_id = ${currentTenant}`,
  });
}

export const tenantType = pgEnum("tenant_type", ["individual", "organization"]);

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(), // slug, "public" for consumers
  name: text("name").notNull(),
  type: tenantType("type").notNull().default("individual"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/*
  Content
  Edited in a spreadsheet and loaded by the seed script. Lessons never store a
  YouTube ID directly; they point at a video asset so the provider can change later.
*/

export const categories = pgTable("categories", {
  id: text("id").primaryKey(), // slug, e.g. "fraud"
  nameHi: text("name_hi").notNull(),
  nameEn: text("name_en").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const videoProvider = pgEnum("video_provider", ["youtube", "bunny", "cloudflare"]);

export const videoAssets = pgTable("video_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: videoProvider("provider").notNull().default("youtube"),
  /** For YouTube this is the video ID. For signed providers, the playback ID. */
  providerRef: text("provider_ref").notNull(),
  durationSec: integer("duration_sec").notNull(),
});

export const courses = pgTable(
  "courses",
  {
    id: text("id").primaryKey(), // slug, e.g. "talk-to-ai"
    /** NULL means global content visible to every tenant. */
    tenantId: text("tenant_id").references(() => tenants.id),
    categoryId: text("category_id").notNull().references(() => categories.id),
    titleHi: text("title_hi").notNull(),
    titleEn: text("title_en").notNull(),
    descriptionHi: text("description_hi"),
    descriptionEn: text("description_en"),
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(false),
  },
  (t) => [
    index("courses_category_idx").on(t.categoryId),
    index("courses_tenant_idx").on(t.tenantId),
    pgPolicy("courses_visible", {
      as: "permissive",
      for: "select",
      using: sql`${bypass} OR tenant_id IS NULL OR tenant_id = ${currentTenant}`,
    }),
    pgPolicy("courses_write", {
      as: "permissive",
      for: "insert",
      withCheck: bypass,
    }),
    pgPolicy("courses_update", { as: "permissive", for: "update", using: bypass, withCheck: bypass }),
    pgPolicy("courses_delete", { as: "permissive", for: "delete", using: bypass }),
  ]
).enableRLS();

export const lessons = pgTable(
  "lessons",
  {
    id: text("id").primaryKey(), // slug, e.g. "talk-to-ai-1"
    courseId: text("course_id").notNull().references(() => courses.id),
    sortOrder: integer("sort_order").notNull(),
    titleHi: text("title_hi").notNull(),
    titleEn: text("title_en").notNull(),
    videoAssetId: uuid("video_asset_id").references(() => videoAssets.id),
    /* Video audio is Hinglish. The Hindi track's transcript is Devanagari with
       English loanwords left in Latin, matching how the lesson is spoken. The
       English track's transcript is plain English. Both describe the same video. */
    transcriptHi: text("transcript_hi"),
    transcriptEn: text("transcript_en"),
    /** Exactly four lessons carry this. They are the whole top of the funnel. */
    isFree: boolean("is_free").notNull().default(false),
  },
  (t) => [index("lessons_course_idx").on(t.courseId)]
);

/*
  People
*/

export const lang = pgEnum("lang", ["hi", "en"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull().default(PUBLIC_TENANT).references(() => tenants.id),
    /** E.164, e.g. +919821340917. The login identity. */
    phone: text("phone").notNull(),
    name: text("name"),
    lang: lang("lang").notNull().default("hi"),
    preferredCategoryId: text("preferred_category_id").references(() => categories.id),
    /** Optional, collected at onboarding. Feeds the social proof popup. */
    city: text("city"),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    referredByCode: text("referred_by_code"),
    /** Set once the referral bonus has been paid out for this user, so it can never pay twice. */
    referralRewardedAt: timestamp("referral_rewarded_at", { withTimezone: true }),
    /** Explicit opt-in for WhatsApp reminders, captured at sign in. Consent must be provable. */
    whatsappOptIn: boolean("whatsapp_opt_in").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (t) => [
    /** A phone number is unique within a tenant, so the same person can belong to an org later. */
    uniqueIndex("users_tenant_phone_idx").on(t.tenantId, t.phone),
    tenantPolicy("users_tenant"),
  ]
).enableRLS();

export const memberRole = pgEnum("member_role", ["learner", "org_admin", "content_admin", "super_admin"]);

/** Roles inside a tenant. Learners are implicit; this table holds elevated roles only. */
export const tenantMembers = pgTable(
  "tenant_members",
  {
    tenantId: text("tenant_id").notNull().references(() => tenants.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    role: memberRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("tenant_members_idx").on(t.tenantId, t.userId, t.role), tenantPolicy("tenant_members_tenant")]
).enableRLS();

/*
  Membership and money
  One plan, gold, one-time payment for a fixed period. A user is gold when a
  membership row exists with status active and valid_until in the future.
*/

export const membershipStatus = pgEnum("membership_status", ["pending", "active", "expired", "refunded"]);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull().default(PUBLIC_TENANT).references(() => tenants.id),
    /** Who learns. */
    userId: uuid("user_id").notNull().references(() => users.id),
    /** Who paid. Same as userId today; differs once gift purchase exists. */
    payerUserId: uuid("payer_user_id").references(() => users.id),
    status: membershipStatus("status").notNull().default("pending"),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("memberships_user_idx").on(t.userId, t.status), tenantPolicy("memberships_tenant")]
).enableRLS();

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull().default(PUBLIC_TENANT).references(() => tenants.id),
    /* Both links are nullable so an account deletion can sever the personal
       connection while the financial record itself survives, which is what
       accounting needs and what the right to erasure allows. */
    membershipId: uuid("membership_id").references(() => memberships.id),
    userId: uuid("user_id").references(() => users.id),
    amountPaise: integer("amount_paise").notNull(),
    /** Our idempotency key, sent to Razorpay as the receipt. A retried request reuses it. */
    receipt: text("receipt").notNull(),
    razorpayOrderId: text("razorpay_order_id"),
    razorpayPaymentId: text("razorpay_payment_id"),
    status: text("status").notNull().default("created"), // created | paid | failed | refunded
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("payments_receipt_idx").on(t.receipt),
    index("payments_status_idx").on(t.status, t.createdAt),
    tenantPolicy("payments_tenant"),
  ]
).enableRLS();

/*
  Progress
*/

export const progress = pgTable(
  "progress",
  {
    tenantId: text("tenant_id").notNull().default(PUBLIC_TENANT).references(() => tenants.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    lessonId: text("lesson_id").notNull().references(() => lessons.id),
    watchedSec: integer("watched_sec").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("progress_user_lesson_idx").on(t.userId, t.lessonId), tenantPolicy("progress_tenant")]
).enableRLS();

/** One row per free lesson a free user completes. The count drives the paywall trigger. */
export const freeWatchLog = pgTable(
  "free_watch_log",
  {
    tenantId: text("tenant_id").notNull().default(PUBLIC_TENANT).references(() => tenants.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    lessonId: text("lesson_id").notNull().references(() => lessons.id),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("free_watch_user_lesson_idx").on(t.userId, t.lessonId), tenantPolicy("free_watch_tenant")]
).enableRLS();

/*
  Referrals. Codes exist only for gold members; entry at sign in is open to all.
*/

export const referralCodes = pgTable(
  "referral_codes",
  {
    code: text("code").primaryKey(),
    tenantId: text("tenant_id").notNull().default(PUBLIC_TENANT).references(() => tenants.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("referral_user_idx").on(t.userId), tenantPolicy("referral_tenant")]
).enableRLS();

/*
  Security plumbing
*/

/** Fixed-window counters for OTP sends, sign-in attempts, and webhooks. Keyed by scope:subject. */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull().default(0),
});

/** Every admin action and every payment event. Append only. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull().default(PUBLIC_TENANT).references(() => tenants.id),
    actorUserId: uuid("actor_user_id"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    ip: text("ip"),
    meta: text("meta"), // JSON string, small
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_created_idx").on(t.createdAt),
    pgPolicy("audit_read", { as: "permissive", for: "select", using: sql`${bypass} OR tenant_id = ${currentTenant}` }),
    pgPolicy("audit_insert", { as: "permissive", for: "insert", withCheck: sql`${bypass} OR tenant_id = ${currentTenant}` }),
    // No update or delete policy: with RLS forced, rows cannot be changed or removed.
  ]
).enableRLS();

/*
  Auth primitives.

  These two tables deliberately carry no RLS policy. An OTP challenge exists
  before anyone is signed in, so there is no tenant to scope it to; a session
  must be looked up before the tenant is known, which is the chicken-and-egg
  the tenant column then resolves. Both are addressed only by an unguessable
  token or by a phone number the caller already proved they control, so there
  is no enumeration surface for RLS to close.
*/

/** One live challenge per phone. Replaced on resend, deleted on success. */
export const otpChallenges = pgTable("otp_challenges", {
  phone: text("phone").primaryKey(), // E.164
  /** HMAC of the code keyed by AUTH_SECRET. A database leak alone cannot brute-force six digits. */
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  /** Carried through verification so a referral survives the OTP round trip. */
  referredByCode: text("referred_by_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const smsStatus = pgEnum("sms_status", ["queued", "delivered", "failed", "unknown"]);

/*
  What happened to each message we asked the provider to send.

  MSG91's send call answers "accepted", not "delivered" — measured, not
  assumed: it returns success for an invalid auth key. So the only way to know
  a code actually arrived is their delivery report, and the only way to match a
  report to a send is the request id they hand back. That id was previously
  written to the log and thrown away, which meant a person saying "no code
  came" could only be answered by searching MSG91's dashboard by hand.

  This is observability, never authority. Nothing about signing in reads this
  table; a forged delivery report can make the log wrong and can do nothing
  else. Rows are swept after thirty days because they hold a phone number and
  support questions do not arrive later than that.
*/
export const smsDeliveries = pgTable(
  "sms_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    /** What the provider returned on send. Null for the dev sender, which sends nothing. */
    providerMessageId: text("provider_message_id"),
    phone: text("phone").notNull(), // E.164
    /** "otp" today. Reminders will share this table rather than grow their own. */
    purpose: text("purpose").notNull().default("otp"),
    status: smsStatus("status").notNull().default("queued"),
    /** The provider's own word for it, kept verbatim: their vocabulary is not ours. */
    providerStatus: text("provider_status"),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    reportedAt: timestamp("reported_at", { withTimezone: true }),
  },
  (t) => [index("sms_deliveries_message_idx").on(t.providerMessageId), index("sms_deliveries_sent_idx").on(t.sentAt)]
);

/** Server-side sessions. The cookie holds the token; the database holds only its hash. */
export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tenantId: text("tenant_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
);
