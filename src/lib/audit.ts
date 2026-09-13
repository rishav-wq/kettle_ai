import { randomUUID } from "node:crypto";
import type { AuditDoc } from "@/lib/db/documents";
import type { Scoped } from "@/lib/db/scope";

type Entry = {
  tenantId: string;
  actorUserId?: string | null;
  action: string; // e.g. "payment.paid", "membership.activated", "admin.user.lookup"
  targetType?: string;
  targetId?: string;
  ip?: string;
  meta?: Record<string, unknown>;
};

/**
 * Appends one audit document.
 *
 * In Postgres this ran inside the caller's transaction, so the audit entry
 * committed with the change it described or not at all. That guarantee is
 * weaker now: the write goes through the same scoped handle but not the same
 * transaction, so a failure between the change and its audit entry leaves the
 * change recorded and the entry missing. Accepted deliberately — the log is
 * for after-the-fact investigation, and the alternative is threading a
 * MongoDB session through every caller for a record nothing reads on the hot
 * path.
 */
export async function audit(db: Scoped, e: Entry): Promise<void> {
  const doc: AuditDoc = {
    id: randomUUID(),
    tenantId: e.tenantId,
    actorUserId: e.actorUserId ?? null,
    action: e.action,
    targetType: e.targetType ?? null,
    targetId: e.targetId ?? null,
    ip: e.ip ?? null,
    meta: e.meta ? JSON.stringify(e.meta).slice(0, 2000) : null,
    createdAt: new Date(),
  };
  await db.insertOne<AuditDoc>("audit_log", doc);
}
