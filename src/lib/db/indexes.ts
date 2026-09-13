import "server-only";
import type { Db, IndexSpecification, CreateIndexesOptions } from "mongodb";

/*
  What the migrations used to declare.

  Postgres had seven numbered migration files; MongoDB creates collections on
  first write and needs no schema, so the only thing left worth declaring is
  the indexes — and, more importantly, the uniqueness constraints, which are
  the part that was doing real work.

  Those constraints are not decoration. `users (tenantId, phone)` is what stops
  one phone number becoming two accounts under a race. `payments.receipt` is
  the idempotency key that stops a retried order charging twice.
  `progress (userId, lessonId)` is what makes the upsert an upsert. Losing any
  of them would be a correctness bug that only shows up under concurrency.

  createIndex is idempotent, so this runs on every connection and is a no-op
  once the indexes exist.
*/

type Spec = [name: string, key: IndexSpecification, options?: CreateIndexesOptions];

const INDEXES: Record<string, Spec[]> = {
  tenants: [["id", { id: 1 }, { unique: true }]],

  categories: [["id", { id: 1 }, { unique: true }]],

  video_assets: [["id", { id: 1 }, { unique: true }]],

  courses: [
    ["id", { id: 1 }, { unique: true }],
    ["category", { categoryId: 1 }],
    ["tenant", { tenantId: 1 }],
  ],

  lessons: [
    ["id", { id: 1 }, { unique: true }],
    ["course", { courseId: 1, sortOrder: 1 }],
  ],

  users: [
    ["id", { id: 1 }, { unique: true }],
    // One phone, one account, per tenant. The constraint the sign-in race needs.
    ["tenant_phone", { tenantId: 1, phone: 1 }, { unique: true }],
  ],

  tenant_members: [["tenant_user_role", { tenantId: 1, userId: 1, role: 1 }, { unique: true }]],

  memberships: [
    ["id", { id: 1 }, { unique: true }],
    ["user_status", { userId: 1, status: 1 }],
  ],

  payments: [
    ["id", { id: 1 }, { unique: true }],
    // The idempotency key. Without this a retried order can charge twice.
    ["receipt", { receipt: 1 }, { unique: true }],
    ["order", { razorpayOrderId: 1 }],
    ["status_created", { status: 1, createdAt: -1 }],
  ],

  progress: [["user_lesson", { userId: 1, lessonId: 1 }, { unique: true }]],

  free_watch_log: [["user_lesson", { userId: 1, lessonId: 1 }, { unique: true }]],

  referral_codes: [
    ["code", { code: 1 }, { unique: true }],
    ["user", { userId: 1 }],
  ],

  rate_limits: [["key", { key: 1 }, { unique: true }]],

  audit_log: [
    ["id", { id: 1 }, { unique: true }],
    ["created", { createdAt: -1 }],
    ["tenant_created", { tenantId: 1, createdAt: -1 }],
  ],

  otp_challenges: [
    // One live challenge per phone; issuing replaces it.
    ["phone", { phone: 1 }, { unique: true }],
    ["expires", { expiresAt: 1 }],
  ],

  sessions: [
    ["token", { tokenHash: 1 }, { unique: true }],
    ["user", { userId: 1 }],
    ["expires", { expiresAt: 1 }],
  ],

  sms_deliveries: [
    ["id", { id: 1 }, { unique: true }],
    ["message", { providerMessageId: 1 }],
    ["sent", { sentAt: 1 }],
  ],
};

/**
 * Applies every index. Safe to call on each connection.
 *
 * Failures are logged rather than thrown. An index that cannot be built — most
 * likely because existing documents violate a new uniqueness constraint — is
 * something to fix deliberately, not a reason to take the whole app down on
 * boot with every page returning 500.
 */
export async function ensureIndexes(db: Db): Promise<void> {
  for (const [collection, specs] of Object.entries(INDEXES)) {
    for (const [name, key, options] of specs) {
      try {
        await db.collection(collection).createIndex(key, { name, ...options });
      } catch (err) {
        console.error(`[db] could not create index ${collection}.${name}:`, err instanceof Error ? err.message : err);
      }
    }
  }
}
