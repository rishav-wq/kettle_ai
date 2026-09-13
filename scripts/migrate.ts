/*
  Applies the SQL in drizzle/ to the database in DATABASE_URL.
  Run this against Neon before deploying schema changes. Locally the app
  migrates PGlite on first use, so this is only for the hosted database.

    npm run db:migrate
*/
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import ws from "ws";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for db:migrate");

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("Migrations applied.");
}

main().catch((e) => { console.error(e); process.exit(1); });
