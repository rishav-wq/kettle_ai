"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { post } from "@/lib/http";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/*
  Starting a Gold purchase, from wherever the button is.

  Two surfaces ask for money: the paywall sheet raised over a locked lesson,
  and the button on /gold. Until this hook they shared the logic by the /gold
  button opening the sheet — which put the whole pitch on screen twice, the
  page and then a sheet repeating the page, before anyone reached checkout.
  Rishav called that on 2026-09-23: the Gold page is already the pitch, so its
  button should go straight to Razorpay.

  So the sequence lives here once. Order first, from the server, which is the
  only place that knows the price and the key. Then Razorpay's hosted checkout
  with that order, or the local stand-in when there are no keys so the flow can
  be walked end to end without them. Success is never taken from the browser
  callback: /gold/success polls the server, and only the webhook grants Gold.

  A signed-out reader is sent to sign in with a way back to /gold. Being quoted
  a price by a product you have not joined is the wrong first conversation, and
  the caller decides what to show instead — the sheet has its own copy for it.
*/
export function useGoldCheckout({ signedIn, months }: { signedIn: boolean; months: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function pay() {
    if (!signedIn) return router.push("/signin?next=/gold");
    setBusy(true);
    setError(false);

    const res = await post<{ orderId: string; amountPaise: number; currency: string; keyId: string | null; simulated: boolean }>(
      "/api/payments/order"
    );
    if (!res.ok || !res.body) {
      setBusy(false);
      setError(true);
      return;
    }

    // No keys yet: walk the same route the webhook would, so the flow is testable.
    if (res.body.simulated) {
      await post("/api/payments/simulate");
      router.push("/gold/success");
      return;
    }

    const openCheckout = () => {
      new window.Razorpay!({
        key: res.body.keyId,
        order_id: res.body.orderId,
        amount: res.body.amountPaise,
        currency: res.body.currency,
        name: "Kettle",
        description: `Kettle Gold · ${months} months`,
        /*
          Pine. Razorpay takes a hex literal rather than a CSS variable, so this
          is the one place a brand colour is repeated outside globals.css and
          the one place it can drift. It was #6C5CE7, a purple inherited from
          the design this started as, which survives nowhere else in the
          product — so the checkout sheet, the single screen that asks for
          money, was the only surface not wearing the brand.
        */
        theme: { color: "#00311F" },
        // Success is confirmed by the webhook, never by this callback.
        handler: () => router.push("/gold/success"),
        modal: { ondismiss: () => setBusy(false) },
      }).open();
    };

    if (window.Razorpay) return openCheckout();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = openCheckout;
    script.onerror = () => {
      setBusy(false);
      setError(true);
    };
    document.body.appendChild(script);
  }

  return { pay, busy, error };
}
