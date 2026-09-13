"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Sheet } from "@/components/ui";
import { post } from "@/lib/http";
import { GOLD_INCLUDES } from "@/lib/payments/includes";
import type { LockReason } from "@/lib/viewer";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/**
 * The paywall.
 *
 * Raised by a locked lesson, by the Gold tab, and by the fourth free lesson
 * finishing. It states the price plainly, says who handles the money, and says
 * cancelling needs no phone call, because for this audience those three
 * sentences are the actual objection.
 */
export function Paywall({
  open,
  onClose,
  reason,
  price,
  months,
  signedIn,
}: {
  open: boolean;
  onClose: () => void;
  reason: LockReason;
  price: string;
  months: number;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function pay() {
    if (!signedIn) return router.push("/signin?next=/gold");
    setBusy(true);
    setError(false);

    const res = await post<{ orderId: string; amountPaise: number; currency: string; keyId: string | null; simulated: boolean }>("/api/payments/order");
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
        theme: { color: "#6C5CE7" },
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

  return (
    <Sheet open={open} onClose={onClose} title="Kettle Gold">
      <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-violet">Kettle Gold</span>
      <h2 className="text-[1.35rem] font-bold leading-tight">
        {reason === "free_limit_reached" ? "You finished the four free lessons. Keep going." : "Open every course"}
      </h2>

      <div className="flex items-baseline gap-2">
        <span className="text-[2.3rem] font-bold leading-none tabular-nums text-violet">{price}</span>
        <span className="text-[0.9rem] font-medium text-ink-3">for {months} months</span>
      </div>

      <ul className="flex flex-col gap-2.5">
        {GOLD_INCLUDES.map((r) => (
          <li key={r} className="flex gap-3 text-[0.92rem] leading-snug text-ink-2">
            <span aria-hidden className="flex-none font-bold text-violet">
              ✓
            </span>
            {r}
          </li>
        ))}
      </ul>

      {error ? (
        <p role="alert" className="rounded-tile bg-pink/10 px-4 py-3 text-[0.9rem] font-medium text-pink">
          The payment could not start. Please try again in a moment.
        </p>
      ) : null}

      <Button full size="lg" disabled={busy} onClick={() => void pay()}>
        {busy ? "Opening…" : "Pay with UPI"}
      </Button>
      <Button full variant="soft" onClick={onClose}>
        Not now
      </Button>
      <p className="pb-1 text-center text-[0.8rem] text-ink-3">Razorpay handles the payment. Kettle never sees your card.</p>
    </Sheet>
  );
}
