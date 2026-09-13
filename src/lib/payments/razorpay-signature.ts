import { createHmac, timingSafeEqual } from "node:crypto";

/*
  Razorpay signs webhooks and checkout callbacks with HMAC-SHA256.
  Both checks use a constant-time compare so a wrong signature takes the same
  time as a right one. The webhook is the only thing allowed to flip entitlement.
*/

/** Webhook: signature over the raw request body, keyed by the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Checkout callback: signature over "order_id|payment_id", keyed by the API secret. Used only to show the verifying state sooner, never to grant access. */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, keySecret: string): boolean {
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}
