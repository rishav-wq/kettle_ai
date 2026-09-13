import { sql } from "drizzle-orm";
import { getDb, type Db } from "./index";

export { PUBLIC_TENANT } from "./schema";

/** A transaction handle with the tenant already set. All queries take one of these. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * The role every tenant transaction runs as. It owns nothing and is not a
 * superuser, so row-level security applies to it on Neon and on the local
 * PGlite database alike. Created and granted in drizzle/0002_app-role.sql.
 */
export const APP_ROLE = "kettle_app";

type Options = {
  /**
   * Stay in the owning role, which row-level security does not apply to, and
   * also set app.bypass_rls for the policies that check it. Only for the seed
   * script, the payment webhook, and super-admin tooling. Never from a user request.
   */
  bypassRls?: boolean;
};

/**
 * Runs `fn` inside a transaction scoped to one tenant.
 *
 * This is the only sanctioned way to touch tenant-scoped tables. It switches to
 * the application role, sets app.tenant_id for the transaction so the policies
 * in schema.ts filter every statement, and never trusts a tenant id from the
 * client: callers pass the id resolved from the session.
 *
 * SET LOCAL ROLE is transaction-scoped, so the connection returns to the owner
 * role when the transaction ends, whichever way it ends.
 */
export async function withTenant<T>(tenantId: string, fn: (tx: Tx) => Promise<T>, opts: Options = {}): Promise<T> {
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(tenantId)) {
    throw new Error(`Invalid tenant id: ${tenantId}`);
  }
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (opts.bypassRls) {
      await tx.execute(sql`select set_config('app.bypass_rls', 'on', true)`);
    } else {
      await tx.execute(sql.raw(`set local role ${APP_ROLE}`));
    }
    await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
    return fn(tx);
  });
}

/** Global reads that touch only non-tenant tables still go through a tenant, so RLS on courses applies. */
export function withPublic<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withTenant("public", fn);
}
