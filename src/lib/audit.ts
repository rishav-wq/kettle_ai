import { auditLog } from "@/lib/db/schema";
import type { Tx } from "@/lib/db/tenant";

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
 * Appends one audit row inside the caller's transaction, so the audit entry
 * commits with the change it describes or not at all.
 */
export async function audit(tx: Tx, e: Entry): Promise<void> {
  await tx.insert(auditLog).values({
    tenantId: e.tenantId,
    actorUserId: e.actorUserId ?? null,
    action: e.action,
    targetType: e.targetType,
    targetId: e.targetId,
    ip: e.ip,
    meta: e.meta ? JSON.stringify(e.meta).slice(0, 2000) : null,
  });
}
