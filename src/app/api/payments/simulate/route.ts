import { assertSameOrigin, toErrorResponse } from "@/lib/security/request";
import { withTenant } from "@/lib/db/tenant";
import type { MembershipDoc, PaymentDoc } from "@/lib/db/documents";
import { validUntilFrom } from "@/lib/payments/plan";
import { audit } from "@/lib/audit";
import { grantReferralReward } from "@/lib/referral";
import { isProd } from "@/lib/env";
import { razorpayMode } from "@/lib/payments/keys";
import { getViewer } from "@/lib/viewer";

/**
 * Stands in for the Razorpay webhook, so the whole purchase flow can be walked
 * end to end locally without a public URL for Razorpay to call back to.
 *
 * It refuses to exist in production. That is the whole of what has to be
 * true: this grants a membership row in whatever database it is pointed at,
 * and production is the only database where that is a real entitlement.
 *
 * It used to refuse whenever any keys were configured. That was the wrong
 * test. Test keys grant play money through a real integration, and a machine
 * that holds them is exactly where this is wanted — so the effect was that
 * configuring Razorpay for testing switched off the one path npm run smoke
 * uses to get past the paywall, and the suite failed on a working system.
 *
 * Nor does it check whether live keys are merely PRESENT. They sit in
 * .env.local beside the test pair on the developer's machine, where
 * src/lib/payments/keys.ts already refuses to use them at all. Refusing here
 * too would disable local testing to guard against a key that cannot fire.
 *
 * The razorpayMode check below is belt and braces rather than an independent
 * guarantee — it derives from NODE_ENV, same as isProd.
 */
export async function POST(req: Request) {
  if (isProd || razorpayMode === "live") {
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
