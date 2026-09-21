import "server-only";

/*
  Every collection, and how each one is isolated.

  This file is the replacement for row-level security, and it is worth being
  clear about what was lost. In Postgres the database refused to return another
  tenant's rows: a query that forgot the tenant returned nothing, and
  scripts/check-rls.ts proved it. MongoDB has no equivalent, so isolation is
  now the application's job — which means a forgotten filter returns everyone's
  documents instead of none.

  The mitigation is to make forgetting impossible rather than unlikely. Nothing
  outside src/lib/db hands out a raw collection handle. Access goes through
  withTenant(), which reads the rule below and applies it to every filter and
  every inserted document. Adding a collection means classifying it here, and
  that is the one review that matters.
*/

export const PUBLIC_TENANT = "public";

/**
 * Owned by exactly one tenant. Mirrors the old tenantPolicy:
 * `tenant_id = current_setting('app.tenant_id')`, for reads and writes alike.
 */
export const OWNED = [
  "users",
  "tenant_members",
  "memberships",
  "payments",
  "progress",
  "free_watch_log",
  "referral_codes",
  "audit_log",
] as const;

/**
 * Catalogue content. Mirrors the old courses_visible policy: a document with
 * no tenantId is global, otherwise it belongs to one tenant. Writes need the
 * bypass, exactly as courses_write did.
 *
 * This was "courses". When courses were flattened away, categories took the
 * classification rather than it disappearing: a tenant with private content of
 * its own is still a thing this model can express, and losing that quietly
 * because of an unrelated refactor would have been the wrong kind of tidying.
 */
export const CONTENT = ["categories"] as const;

/**
 * Global reference data with no tenant column at all: the lessons inside a
 * category, video assets, the tenant registry itself.
 */
export const GLOBAL = ["tenants", "lessons", "video_assets"] as const;

/**
 * Infrastructure that exists before anyone is known, so there is no tenant to
 * scope by. These were outside RLS in Postgres too — a sign-in code is issued
 * before we know who the person is, and a session is what tells us.
 */
export const UNSCOPED = ["otp_challenges", "sessions", "rate_limits", "sms_deliveries"] as const;

export type OwnedCollection = (typeof OWNED)[number];
export type ContentCollection = (typeof CONTENT)[number];
export type GlobalCollection = (typeof GLOBAL)[number];
export type UnscopedCollection = (typeof UNSCOPED)[number];
export type CollectionName = OwnedCollection | ContentCollection | GlobalCollection | UnscopedCollection;

const OWNED_SET: ReadonlySet<string> = new Set(OWNED);
const CONTENT_SET: ReadonlySet<string> = new Set(CONTENT);

export type Scoping = "owned" | "content" | "global" | "unscoped";

export function scopingOf(name: CollectionName): Scoping {
  if (OWNED_SET.has(name)) return "owned";
  if (CONTENT_SET.has(name)) return "content";
  if ((GLOBAL as readonly string[]).includes(name)) return "global";
  return "unscoped";
}
