import "server-only";
import { env } from "@/lib/env";
import { razorpayConfigured, razorpayKeys } from "@/lib/payments/keys";
import { GOLD } from "./plan";

/*
  Razorpay order creation.

  We never touch card data. The browser opens Razorpay's hosted checkout with
  an order id, the money moves between the payer and Razorpay, and the webhook
  tells us it happened. That keeps us out of PCI scope entirely.

  Without keys the client runs in simulation so the whole flow, including the
  webhook, can be exercised locally. Production refuses to simulate.
*/

export type Order = { orderId: string; amountPaise: number; currency: string; keyId: string | null; simulated: boolean };

export { razorpayConfigured, razorpayMode, razorpayPublicKeyId } from "@/lib/payments/keys";

export async function createOrder(receipt: string, notes: Record<string, string>): Promise<Order> {
  if (!razorpayConfigured) {
    if (env.NODE_ENV === "production") throw new Error("Razorpay keys are not configured.");
    return { orderId: `order_sim_${receipt}`, amountPaise: GOLD.amountPaise, currency: GOLD.currency, keyId: null, simulated: true };
  }

  const { keyId, keySecret } = razorpayKeys();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Basic ${auth}` },
    body: JSON.stringify({
      amount: GOLD.amountPaise,
      currency: GOLD.currency,
      // Our idempotency key. Razorpay rejects a duplicate receipt on a paid order,
      // which is what stops a double tap becoming a double charge.
      receipt,
      notes,
    }),
  });

  if (!res.ok) {
    throw new Error(`razorpay_order_failed:${res.status}`);
  }
  const body = (await res.json()) as { id: string; amount: number; currency: string };
  /*
    The key id the browser must open checkout with — from the resolver, not
    from env.RAZORPAY_KEY_ID. Those stopped being the same thing when the test
    and live pairs got their own names: a deployment configured with
    RAZORPAY_TEST_KEY_ID would have created a perfectly good order here and
    then handed the client a null key, so checkout would never open and the
    failure would look like Razorpay's rather than ours.
  */
  return { orderId: body.id, amountPaise: body.amount, currency: body.currency, keyId, simulated: false };
}
