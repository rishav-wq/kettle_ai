/*
  Connectivity check for the Atlas cluster.

  Reads DATABASE_URL from .env.local and never prints it. Reports only whether
  the handshake works, what database the URI selects, and what is already in
  there — so a migration is never run blind against something that has data.
*/
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";

const file = path.join(process.cwd(), ".env.local");
if (!existsSync(file)) {
  console.error("No .env.local");
  process.exit(1);
}

let uri = "";
for (const raw of readFileSync(file, "utf8").split("\n")) {
  const line = raw.trim();
  if (!line.startsWith("DATABASE_URL=")) continue;
  uri = line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
}
if (!uri) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 12000 });

try {
  await client.connect();
  const admin = client.db().admin();
  const info = await admin.serverStatus().catch(() => null);

  // A default database in the URI is required: the app must not have to guess.
  const dbName = client.db().databaseName;
  console.log("connection:  ok");
  console.log("server:      " + (info?.version ? `MongoDB ${info.version}` : "reachable"));
  console.log("database:    " + dbName);

  const collections = await client.db().listCollections().toArray();
  console.log("collections: " + (collections.length ? collections.map((c) => c.name).join(", ") : "(none — empty database)"));

  // Transactions need a replica set. Atlas gives one; a standalone server does not.
  const hello = await client.db().command({ hello: 1 });
  console.log("replica set: " + (hello.setName ? `yes (${hello.setName})` : "NO — multi-document transactions unavailable"));
} catch (err) {
  console.error("connection:  FAILED");
  console.error(String(err?.message ?? err).split("\n")[0]);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
