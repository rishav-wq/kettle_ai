/*
  Makes .env.local available to a script.

  Next loads it automatically for the app; tsx does not, so anything run from
  the command line sees an empty environment. That used to be invisible because
  the Postgres connector fell back to an embedded database when DATABASE_URL
  was missing — the seed script "worked" while silently writing somewhere else.
  MongoDB has no fallback, so a missing variable now fails immediately, which is
  better, but only if the file is actually read.

  Import this first, before anything that touches src/lib/env or the database.
*/
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), ".env.local");

if (existsSync(file)) {
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    // A real environment variable always wins, so CI and the shell can override.
    if (value && process.env[key] === undefined) process.env[key] = value;
  }
}
