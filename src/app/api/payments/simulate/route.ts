import { assertSameOrigin, toErrorResponse } from "@/lib/security/request";
import { withTenant } from "@/lib/db/tenant";
import type { MembershipDoc, PaymentDoc } from "@/lib/db/documents";
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

    const outcome = await withTenant(viewer.tenantId, async (db) => {
      const now = new Date();

      /*
        Like the real webhook, only an unsettled payment can be settled, and
        calling this twice must not re-activate and wipe out an extension.
        The settle is a conditional update rather than read-then-write, so the
        status itself is the lock: whoever flips it from "created" owns the
        activation and a second caller finds nothing to do.
      */
      const pending = await db.findOne<PaymentDoc>("payments", { userId: viewer.userId!, status: "created" });
      if (!pending) return "idempotent" as const;

      const claimed = await db.updateOne<PaymentDoc>(
        "payments",
        { id: pending.id, status: "created" },
        { $set: { status: "paid", paidAt: now, razorpayPaymentId: "pay_simulated" } }
      );
      if (claimed === 0) return "idempotent" as const;

      if (pending.membershipId) {
        await db.updateOne<MembershipDoc>(
          "memberships",
          { id: pending.membershipId },
          { $set: { status: "active", validFrom: now, validUntil: validUntilFrom(now) } }
        );
      }
      await audit(db, { tenantId: viewer.tenantId, actorUserId: viewer.userId, action: "membership.activated_simulated", targetType: "membership", targetId: pending.membershipId ?? pending.id });
      await grantReferralReward(db, viewer.tenantId, viewer.userId!);
      return "activated" as const;
    });

    return Response.json({ ok: true, outcome });
  } catch (err) {
    return toErrorResponse(err);
  }
}
