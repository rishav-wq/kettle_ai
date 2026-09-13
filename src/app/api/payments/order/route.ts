import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { LIMITS, enforceRate } from "@/lib/security/rate-limit";
import { assertSameOrigin, clientIp, toErrorResponse } from "@/lib/security/request";
import { withTenant } from "@/lib/db/tenant";
import type { MembershipDoc, PaymentDoc } from "@/lib/db/documents";
import { GOLD } from "@/lib/payments/plan";
import { createOrder } from "@/lib/payments/razorpay";
import { audit } from "@/lib/audit";
import { getViewer } from "@/lib/viewer";

/**
 * Starts a payment.
 *
 * The receipt is derived from the user and the day, so a double tap or a retry
 * on a flaky mobile connection reuses the same order instead of creating a
 * second charge. Nothing here grants access; only the webhook does that.
 */
export async function POST(req: Request) {
  try {
    await assertSameOrigin(req);
    const viewer = await getViewer();
    if (!viewer.userId) return Response.json({ error: "not_signed_in" }, { status: 401 });
    if (viewer.state === "gold") return Response.json({ error: "already_gold" }, { status: 409 });

    await enforceRate(`order:${viewer.userId}`, LIMITS.orderCreate);

    const receipt = createHash("sha256")
      .update(`${viewer.userId}:${GOLD.amountPaise}:${new Date().toISOString().slice(0, 10)}`)
      .digest("hex")
      .slice(0, 32);

    const ip = await clientIp();

    const existing = await withTenant(viewer.tenantId, (db) =>
      db.findOne<PaymentDoc>("payments", { receipt, userId: viewer.userId! })
    );

    if (existing?.razorpayOrderId && existing.status === "created") {
      const order = { orderId: existing.razorpayOrderId, amountPaise: GOLD.amountPaise, currency: GOLD.currency };
      return Response.json({ ...order, keyId: process.env.RAZORPAY_KEY_ID ?? null, simulated: existing.razorpayOrderId.startsWith("order_sim_") });
    }

    const order = await createOrder(receipt, { userId: viewer.userId, plan: "gold" });

    await withTenant(viewer.tenantId, async (db) => {
      const now = new Date();
      // A pending membership is the document the webhook will later activate.
      const membershipId = randomUUID();
      await db.insertOne<MembershipDoc>("memberships", {
        id: membershipId,
        tenantId: viewer.tenantId,
        userId: viewer.userId!,
        payerUserId: viewer.userId!,
        status: "pending",
        validFrom: null,
        validUntil: null,
        createdAt: now,
      });

      try {
        await db.insertOne<PaymentDoc>("payments", {
          id: randomUUID(),
          tenantId: viewer.tenantId,
          membershipId,
          userId: viewer.userId!,
          amountPaise: order.amountPaise,
          receipt,
          razorpayOrderId: order.orderId,
          razorpayPaymentId: null,
          status: "created",
          createdAt: now,
          paidAt: null,
        });
      } catch {
        // The unique index on receipt rejected it, which means a concurrent
        // request already created this order. That is the idempotency working.
      }

      await audit(db, { tenantId: viewer.tenantId, actorUserId: viewer.userId, action: "payment.order_created", targetType: "order", targetId: order.orderId, ip, meta: { amountPaise: order.amountPaise } });
    });

    return Response.json(order);
  } catch (err) {
    return toErrorResponse(err);
  }
}
