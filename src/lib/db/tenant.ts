/*
  The tenant entry point.

  This module used to open a Postgres transaction, switch to the kettle_app
  role and set app.tenant_id so row-level security filtered every statement.
  MongoDB has no equivalent, so the scoping moved into src/lib/db/scope.ts,
  which narrows every read and stamps every write instead.

  The path stays the same on purpose: roughly twenty pages and routes import
  withTenant from here, and none of them cared how the scoping was enforced.
  Keeping the seam means the port did not have to touch a single one of them.
*/
export { PUBLIC_TENANT, withTenant, withPublic, type Scoped } from "./scope";

/**
 * The handle passed to a scoped callback.
 *
 * Named Tx for the same reason: every query module is typed against it, and it
 * is still "the thing you are given inside withTenant". It is no longer a
 * transaction, which is a real difference worth knowing — see the note on
 * atomicity in src/lib/audit.ts and the claim-first pattern in
 * src/lib/referral.ts, where that difference actually mattered.
 */
export type { Scoped as Tx } from "./scope";
