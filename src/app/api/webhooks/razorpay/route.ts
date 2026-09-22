import { withTenant } from "@/lib/db/tenant";
import type { MembershipDoc, PaymentDoc } from "@/lib/db/documents";
import { verifyWebhookSignature } from "@/lib/payments/razorpay-signature";
import { validUntilFrom } from "@/lib/payments/plan";
import { audit } from "@/lib/audit";
import { grantReferralReward } from "@/lib/referral";
import { razorpayMode, razorpayWebhookSecret } from "@/lib/payments/keys";

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
  const secret = razorpayWebhookSecret();

  if (!secret) {
    /*
      Name the variable this mode actually reads. There are three now, and a
      message naming the wrong one sends whoever is debugging to a dashboard
      they have already filled in. This is the failure that loses a payment:
      Razorpay took the money, called here, and got a 503 — so the charge is
      real and the membership was never granted.
    */
    console.error(
      `razorpay webhook received but no ${razorpayMode} webhook secret is set. Set RAZORPAY_${razorpayMode.toUpperCase()}_WEBHOOK_SECRET (or RAZORPAY_WEBHOOK_SECRET). THIS PAYMENT WAS NOT GRANTED.`
    );
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
  const payment = await withTenant("public", (db) => db.findOne<PaymentDoc>("payments", { razorpayOrderId: orderId }), {
    bypass: true,
  });
  if (!payment) return Response.json({ ok: true, ignored: "unknown_order" });

  // Already settled. Razorpay retried; do nothing and report success so it stops.
  if (payment.status === "paid" || payment.status === "refunded") {
    return Response.json({ ok: true, idempotent: true });
  }

  await withTenant(payment.tenantId, async (db) => {
    if (failed) {
      await db.updateOne<PaymentDoc>("payments", { id: payment.id }, { $set: { status: "failed" } });
      await audit(db, { tenantId: payment.tenantId, actorUserId: payment.userId, action: "payment.failed", targetType: "order", targetId: orderId });
      return;
    }

    const now = new Date();

    /*
      Conditional on the status, so the settle is the lock. Razorpay retries,
      and without a transaction two retries arriving together could both pass
      the "already settled" check above and both activate. Only the caller that
      actually flips "created" goes on to grant anything.
    */
    const claimed = await db.updateOne<PaymentDoc>(
      "payments",
      { id: payment.id, status: "created" },
      { $set: { status: "paid", paidAt: now, razorpayPaymentId: entity?.id ?? null } }
    );
    if (claimed === 0) return;

    if (payment.membershipId) {
      await db.updateOne<MembershipDoc>(
        "memberships",
        { id: payment.membershipId },
        { $set: { status: "active", validFrom: now, validUntil: validUntilFrom(now) } }
      );
    }

    await audit(db, {
      tenantId: payment.tenantId,
      actorUserId: payment.userId,
      action: "membership.activated",
      targetType: "membership",
      targetId: payment.membershipId ?? orderId,
      meta: { orderId, paymentId: entity?.id, amountPaise: entity?.amount },
    });

    // The one moment a referral pays out. Idempotent, so a retried webhook cannot pay twice.
    if (payment.userId) {
      await grantReferralReward(db, payment.tenantId, payment.userId);
    }
  });

  return Response.json({ ok: true });
}
