import "server-only";
import { MongoClient, type Db } from "mongodb";
import { ensureIndexes } from "./indexes";

/*
  One MongoDB handle for the whole app.

  Cached on globalThis because Next reloads modules on every edit in
  development and each reload would otherwise open a new connection pool until
  Atlas refused them. Same reason the Postgres handle was cached before.

  There is no local fallback any more. PGlite gave this project a database that
  needed no setup — `npm run dev` worked on a clean machine — and MongoDB has
  no in-process equivalent, so DATABASE_URL is now required everywhere,
  including on a laptop with no network.
*/

declare global {
  var __kettleMongo: Promise<MongoClient> | undefined;
}

/*
  Validated here rather than in env.ts, at the point of use rather than at
  import. A bad connection string should stop the thing that needs it, not take
  down every page at boot — which is exactly what happened when this check
  lived in the env schema and the app was still running on the old database.
*/
function assertUsableUri(uri: string): void {
  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    throw new Error("DATABASE_URL must be a mongodb:// or mongodb+srv:// connection string.");
  }
  // Atlas hands you a URI with nothing between the host and the query string,
  // and the driver then quietly uses a database called "test".
  if (!/^mongodb(\+srv)?:\/\/[^/]+\/[^/?]+/i.test(uri)) {
    throw new Error("DATABASE_URL must name a database, e.g. ...mongodb.net/kettle?retryWrites=true&w=majority");
  }
}

function connect(): Promise<MongoClient> {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("DATABASE_URL is not set. MongoDB has no embedded fallback; set a connection string in .env.local.");
  }
  assertUsableUri(uri);

  const client = new MongoClient(uri, {
    // Fail fast rather than hanging a request for half a minute when the
    // cluster is unreachable or the IP is not allowed.
    serverSelectionTimeoutMS: 10_000,
    retryWrites: true,
  });

  return client.connect().then(async (connected) => {
    // Indexes are the only thing left of the migrations, and they carry the
    // uniqueness constraints the app's correctness depends on. Applied once
    // per connection, which is a no-op after the first.
    await ensureIndexes(connected.db());
    return connected;
  });
}

export function getClient(): Promise<MongoClient> {
  if (!globalThis.__kettleMongo) globalThis.__kettleMongo = connect();
  return globalThis.__kettleMongo;
}

/** The database named in the connection string. Never guessed. */
export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db();
}
