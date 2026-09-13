import "server-only";
import { env } from "@/lib/env";
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

export const razorpayConfigured = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

export async function createOrder(receipt: string, notes: Record<string, string>): Promise<Order> {
  if (!razorpayConfigured) {
    if (env.NODE_ENV === "production") throw new Error("Razorpay keys are not configured.");
    return { orderId: `order_sim_${receipt}`, amountPaise: GOLD.amountPaise, currency: GOLD.currency, keyId: null, simulated: true };
  }

  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
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
  return { orderId: body.id, amountPaise: body.amount, currency: body.currency, keyId: env.RAZORPAY_KEY_ID!, simulated: false };
}
