import path from "node:path";
import { mkdirSync } from "node:fs";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import * as schema from "./schema";

/*
  One database handle for the whole app.

  Production: Neon over WebSocket. The Pool gives real sessions, which the
  tenant transaction needs for set_config to hold across statements.

  Local, when DATABASE_URL is unset: PGlite, a real Postgres compiled to WASM,
  persisted under .data/pglite. Migrations apply on first use. Zero setup, and
  the same RLS policies are enforced, so a scoping bug fails locally too.
*/

export type Db = ReturnType<typeof drizzleNeon<typeof schema>>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

declare global {
  var __kettleDb: Promise<Db> | undefined;
}

async function connect(): Promise<Db> {
  /*
    TEMPORARY, for the MongoDB migration only. DATABASE_URL now holds a
    mongodb+srv:// URI, which this Postgres connector would hand to a Neon Pool
    and fail on. Ignoring anything that is not a Postgres URL keeps the app
    running on the embedded database while the data layer is ported.

    Delete this whole branch at cutover, along with the rest of this file.
  */
  const raw = process.env.DATABASE_URL;
  const url = raw && /^postgres(ql)?:\/\//i.test(raw) ? raw : undefined;
  if (raw && !url) {
    console.warn("[db] DATABASE_URL is not a Postgres URL; using the embedded database while the MongoDB migration is in progress.");
  }

  if (url) {
    if (typeof WebSocket === "undefined") {
      const { default: ws } = await import("ws");
      neonConfig.webSocketConstructor = ws;
    }
    const pool = new Pool({ connectionString: url });
    return drizzleNeon(pool, { schema });
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is not set. Production refuses to fall back to the local database.");
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  // PGlite is single-writer, so a running dev server owns .data/pglite and any
  // second process aborts inside WASM on its first statement. KETTLE_PGLITE_DIR
  // gives the verification scripts their own throwaway copy of the database so
  // they can run without stopping the server. Dev only; unreachable once
  // DATABASE_URL is set.
  const dir = process.env.KETTLE_PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as Db;
}

/** Resolves the shared handle. Cached across hot reloads in dev. */
export function getDb(): Promise<Db> {
  if (!globalThis.__kettleDb) globalThis.__kettleDb = connect();
  return globalThis.__kettleDb;
}

export { schema };
