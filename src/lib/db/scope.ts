import "server-only";
import type { Document, Filter, OptionalUnlessRequiredId, UpdateFilter, WithId } from "mongodb";
import { getDb } from "./mongo";
import { PUBLIC_TENANT, scopingOf, type CollectionName } from "./collections";

export { PUBLIC_TENANT };

/*
  The only sanctioned way to touch data.

  withTenant() hands the callback a scoped handle. Every read it performs is
  narrowed to the tenant, and every document it writes is stamped with the
  tenant — not because the caller remembered, but because the handle does it.
  The caller cannot opt out: there is no method here that takes a raw filter
  straight through to the driver.

  This is weaker than what it replaces. Row-level security was enforced by
  Postgres and applied even to a hand-written query in a console; this applies
  only to code that goes through it. The compensating rule is that nothing
  outside src/lib/db imports the driver, so "goes through it" is a property you
  can check with one grep rather than a convention you have to trust.
*/

type Options = {
  /**
   * Skip tenant narrowing entirely. The direct equivalent of the old
   * bypassRls: for the seed script, the payment webhook discovering which
   * tenant an order belongs to, and super-admin tooling. Never from a request
   * whose tenant came from a session — that is what the scoped path is for.
   */
  bypass?: boolean;
};

/** A filter with the tenant already applied. */
export type Scoped = {
  readonly tenantId: string;

  findOne<T extends Document>(name: CollectionName, filter?: Filter<T>): Promise<WithId<T> | null>;
  find<T extends Document>(
    name: CollectionName,
    filter?: Filter<T>,
    opts?: { sort?: Document; limit?: number; skip?: number; projection?: Document }
  ): Promise<WithId<T>[]>;
  countDocuments<T extends Document>(name: CollectionName, filter?: Filter<T>): Promise<number>;

  insertOne<T extends Document>(name: CollectionName, doc: OptionalUnlessRequiredId<T>): Promise<void>;
  insertMany<T extends Document>(name: CollectionName, docs: OptionalUnlessRequiredId<T>[]): Promise<void>;
  updateOne<T extends Document>(name: CollectionName, filter: Filter<T>, update: UpdateFilter<T>, opts?: { upsert?: boolean }): Promise<number>;
  updateMany<T extends Document>(name: CollectionName, filter: Filter<T>, update: UpdateFilter<T>): Promise<number>;
  deleteOne<T extends Document>(name: CollectionName, filter: Filter<T>): Promise<number>;
  deleteMany<T extends Document>(name: CollectionName, filter: Filter<T>): Promise<number>;
};

/** Narrows a read filter according to how the collection is classified. */
function scopeRead(name: CollectionName, tenantId: string, filter: Document, bypass: boolean): Document {
  if (bypass) return filter;
  switch (scopingOf(name)) {
    case "owned":
      return { ...filter, tenantId };
    case "content":
      // Global content has no tenantId; tenant content has this one. Mirrors
      // `tenant_id IS NULL OR tenant_id = current_setting(...)`.
      return { ...filter, $or: [{ tenantId: null }, { tenantId }] };
    default:
      return filter;
  }
}

/** Stamps the tenant onto a document being written. */
function scopeWrite(name: CollectionName, tenantId: string, doc: Document, bypass: boolean): Document {
  if (bypass) return doc;
  if (scopingOf(name) === "owned") return { ...doc, tenantId };
  return doc;
}

export async function withTenant<T>(tenantId: string, fn: (db: Scoped) => Promise<T>, opts: Options = {}): Promise<T> {
  // Same guard the Postgres version had. A tenant id is never taken from a
  // request body, but validating it here means a bug upstream cannot turn into
  // an injected filter.
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(tenantId)) {
    throw new Error(`Invalid tenant id: ${tenantId}`);
  }

  const db = await getDb();
  const bypass = opts.bypass === true;

  const scoped: Scoped = {
    tenantId,

    async findOne(name, filter = {}) {
      return db.collection(name).findOne(scopeRead(name, tenantId, filter as Document, bypass)) as never;
    },

    async find(name, filter = {}, options = {}) {
      let cursor = db.collection(name).find(scopeRead(name, tenantId, filter as Document, bypass));
      if (options.projection) cursor = cursor.project(options.projection) as never;
      if (options.sort) cursor = cursor.sort(options.sort);
      if (options.skip) cursor = cursor.skip(options.skip);
      if (options.limit) cursor = cursor.limit(options.limit);
      return (await cursor.toArray()) as never;
    },

    async countDocuments(name, filter = {}) {
      return db.collection(name).countDocuments(scopeRead(name, tenantId, filter as Document, bypass));
    },

    async insertOne(name, doc) {
      await db.collection(name).insertOne(scopeWrite(name, tenantId, doc as Document, bypass) as never);
    },

    async insertMany(name, docs) {
      const stamped = (docs as Document[]).map((d) => scopeWrite(name, tenantId, d, bypass));
      await db.collection(name).insertMany(stamped as never);
    },

    async updateOne(name, filter, update, options = {}) {
      const res = await db
        .collection(name)
        .updateOne(scopeRead(name, tenantId, filter as Document, bypass), update as Document, { upsert: options.upsert === true });
      return res.modifiedCount + res.upsertedCount;
    },

    async updateMany(name, filter, update) {
      const res = await db.collection(name).updateMany(scopeRead(name, tenantId, filter as Document, bypass), update as Document);
      return res.modifiedCount;
    },

    async deleteOne(name, filter) {
      const res = await db.collection(name).deleteOne(scopeRead(name, tenantId, filter as Document, bypass));
      return res.deletedCount;
    },

    async deleteMany(name, filter) {
      const res = await db.collection(name).deleteMany(scopeRead(name, tenantId, filter as Document, bypass));
      return res.deletedCount;
    },
  };

  return fn(scoped);
}

/** Global reads still go through a tenant, so content scoping applies. */
export function withPublic<T>(fn: (db: Scoped) => Promise<T>): Promise<T> {
  return withTenant(PUBLIC_TENANT, fn);
}
