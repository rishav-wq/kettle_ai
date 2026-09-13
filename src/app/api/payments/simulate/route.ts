import { and, asc, eq } from "drizzle-orm";
import { assertSameOrigin, toErrorResponse } from "@/lib/security/request";
import { withTenant } from "@/lib/db/tenant";
import { memberships, payments } from "@/lib/db/schema";
import { validUntilFrom } from "@/lib/payments/plan";
import { audit } from "@/lib/audit";
import { grantReferralReward } from "@/lib/referral";
import { isProd } from "@/lib/env";
import { razorpayConfigured } from "@/lib/payments/razorpay";
import { getViewer } from "@/lib/viewer";

/**
 * Stands in for the Razorpay webhook while there are no keys, so the whole
 * purchase flow can be walked end to end locally.
 *
 * Refuses to exist in production, and refuses to run once real keys are
 * present, so it cannot become a way to grant a free membership.
 */
export async function POST(req: Request) {
  if (isProd || razorpayConfigured) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  try {
    await assertSameOrigin(req);
    const viewer = await getViewer();
    if (!viewer.userId) return Response.json({ error: "not_signed_in" }, { status: 401 });

    const outcome = await withTenant(viewer.tenantId, async (tx) => {
      // Like the real webhook, only an unsettled payment can be settled. Calling
      // this twice must not re-activate and wipe out an extension.
      const [pending] = await tx
        .select({ id: payments.id, membershipId: payments.membershipId })
        .from(payments)
        .where(and(eq(payments.userId, viewer.userId!), eq(payments.status, "created")))
        .orderBy(asc(payments.createdAt))
        .limit(1);
      if (!pending) return "idempotent" as const;

      const now = new Date();
      await tx.update(payments).set({ status: "paid", paidAt: now, razorpayPaymentId: "pay_simulated" }).where(eq(payments.id, pending.id));
      if (pending.membershipId) {
        await tx.update(memberships).set({ status: "active", validFrom: now, validUntil: validUntilFrom(now) }).where(eq(memberships.id, pending.membershipId));
      }
      await audit(tx, { tenantId: viewer.tenantId, actorUserId: viewer.userId, action: "membership.activated_simulated", targetType: "membership", targetId: pending.membershipId ?? pending.id });
      await grantReferralReward(tx, viewer.tenantId, viewer.userId!);
      return "activated" as const;
    });

    return Response.json({ ok: true, outcome });
  } catch (err) {
    return toErrorResponse(err);
  }
}
