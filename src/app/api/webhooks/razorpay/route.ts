import { eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { memberships, payments } from "@/lib/db/schema";
import { verifyWebhookSignature } from "@/lib/payments/razorpay-signature";
import { validUntilFrom } from "@/lib/payments/plan";
import { audit } from "@/lib/audit";
import { grantReferralReward } from "@/lib/referral";
import { env } from "@/lib/env";

/*
  The only place entitlement is granted.

  Webhooks skip the same-origin check, because there is no origin, and prove
  themselves with an HMAC signature over the raw body instead. The body must be
  read as text before parsing, since the signature covers the exact bytes.

  Idempotent by design: Razorpay retries, and an activation that runs twice must
  not extend a membership twice.
*/

type Payload = {
  event: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; amount?: number } };
  };
};

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  const secret = env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error("razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not set");
    return Response.json({ error: "not_configured" }, { status: 503 });
  }
  if (!verifyWebhookSignature(raw, signature, secret)) {
    // Deliberately terse. A forged call learns nothing about why it failed.
    return Response.json({ error: "bad_signature" }, { status: 401 });
  }

  let body: Payload;
  try {
    body = JSON.parse(raw) as Payload;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const entity = body.payload?.payment?.entity;
  const orderId = entity?.order_id;
  if (!orderId) return Response.json({ ok: true, ignored: "no_order_id" });

  const paid = body.event === "payment.captured" || body.event === "order.paid";
  const failed = body.event === "payment.failed";
  if (!paid && !failed) return Response.json({ ok: true, ignored: body.event });

  /*
    The tenant is not in the webhook, and must not be taken from it. We look the
    payment up with RLS bypassed to discover which tenant it belongs to, then do
    all the writing inside that tenant's scope.
  */
  const found = await withTenant(
    "public",
    (tx) =>
      tx
        .select({ id: payments.id, tenantId: payments.tenantId, userId: payments.userId, membershipId: payments.membershipId, status: payments.status })
        .from(payments)
        .where(eq(payments.razorpayOrderId, orderId))
        .limit(1),
    { bypassRls: true }
  );

  const payment = found[0];
  if (!payment) return Response.json({ ok: true, ignored: "unknown_order" });

  // Already settled. Razorpay retried; do nothing and report success so it stops.
  if (payment.status === "paid" || payment.status === "refunded") {
    return Response.json({ ok: true, idempotent: true });
  }

  await withTenant(payment.tenantId, async (tx) => {
    if (failed) {
      await tx.update(payments).set({ status: "failed" }).where(eq(payments.id, payment.id));
      await audit(tx, { tenantId: payment.tenantId, actorUserId: payment.userId, action: "payment.failed", targetType: "order", targetId: orderId });
      return;
    }

    const now = new Date();
    await tx
      .update(payments)
      .set({ status: "paid", paidAt: now, razorpayPaymentId: entity?.id ?? null })
      .where(eq(payments.id, payment.id));

    if (payment.membershipId) {
      await tx
        .update(memberships)
        .set({ status: "active", validFrom: now, validUntil: validUntilFrom(now) })
        .where(eq(memberships.id, payment.membershipId));
    }

    await audit(tx, {
      tenantId: payment.tenantId,
      actorUserId: payment.userId,
      action: "membership.activated",
      targetType: "membership",
      targetId: payment.membershipId ?? orderId,
      meta: { orderId, paymentId: entity?.id, amountPaise: entity?.amount },
    });

    // The one moment a referral pays out. Idempotent, so a retried webhook cannot pay twice.
    if (payment.userId) {
      await grantReferralReward(tx, payment.tenantId, payment.userId);
    }
  });

  return Response.json({ ok: true });
}
