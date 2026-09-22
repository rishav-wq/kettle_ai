"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Sheet } from "@/components/ui";
import { ShieldIcon } from "@/components/icons";
import { post } from "@/lib/http";
import { GOLD_INCLUDES } from "@/lib/payments/includes";
import type { LockReason } from "@/lib/viewer";
import { T } from "@/components/bilingual";
import { useLang } from "@/components/lang-provider";
import { pick } from "@/lib/pick";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/**
 * The paywall.
 *
 * Raised by a locked lesson, by the Gold tab, and by the fourth free lesson
 * finishing. It states the price plainly and says who handles the money,
 * because for this audience those are the actual objections.
 *
 * It asks for money only from someone who has an account. A signed-out
 * visitor tapping a locked lesson used to get the full price pitch and was
 * bounced to sign-in only after pressing Pay — being quoted a price by a
 * product you have not joined is the wrong first conversation, particularly
 * with an audience this wary. They now get an invitation to sign in, and meet
 * Gold afterwards, once they have four free lessons behind them.
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
  const lang = useLang();
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

  /*
    Signed out: invite, do not sell. The lesson they tapped is the reason they
    are here, so the copy names that rather than the plan.
  */
  if (!signedIn) {
    return (
      <Sheet open={open} onClose={onClose} title={pick(lang, "आगे बढ़ने के लिए साइन इन", "Sign in to continue")}>
        <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-violet">
          <T hi="शुरू करना मुफ़्त है" en="Free to start" />
        </span>
        <h2 className="text-[1.35rem] font-bold leading-tight">
          <T hi="यह lesson देखने के लिए साइन इन कीजिए" en="Sign in to watch this lesson" />
        </h2>
        <p className="text-[0.95rem] leading-relaxed text-ink-2">
          <T
            hi="चार lessons मुफ़्त हैं, और हम याद रखते हैं कि आप कहाँ रुके थे। कार्ड की ज़रूरत नहीं।"
            en="Four lessons are free, and we remember where you stopped. No card needed."
          />
        </p>

        <Button full size="lg" onClick={() => router.push("/signin?next=/learn")}>
          <T hi="साइन इन कीजिए" en="Sign in" />
        </Button>
        <button
          type="button"
          onClick={onClose}
          className="mx-auto pb-1 text-[0.9rem] text-ink-3 underline underline-offset-4"
        >
          <T hi="अभी नहीं" en="Not now" />
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title="Kettle Gold">
      {/* The one gold surface in the product. It marks the paid plan and
          nothing else, which is what stops it becoming decoration. */}
      {/*
        The same block as the top of /gold, in the same order: name the plan,
        say what it opens, say the thing everyone is actually worried about,
        then the price. The sheet used to skip the third line, which is the one
        that answers "will this keep charging me" — the objection this audience
        brings to every payment screen, and the reason the copy exists at all.
      */}
      <div className="gold-surface -mx-5 -mt-4 flex flex-col gap-1.5 px-6 py-7 text-on-gold sm:-mx-7 sm:-mt-6 sm:px-7 sm:pt-8">
        <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-on-gold/70">Kettle Gold</span>
        <h2 className="text-[1.35rem] font-bold leading-tight">
          {reason === "free_limit_reached" ? (
            <T hi="आपने चारों मुफ़्त lessons पूरे कर लिए। आगे बढ़ते रहिए।" en="You finished the four free lessons. Keep going." />
          ) : (
            <T hi="हर lesson खोल लीजिए" en="Open every lesson" />
          )}
        </h2>
        <p className="max-w-[40ch] text-[0.92rem] leading-relaxed text-on-gold/80">
          <T hi="एक बार का payment। अपने आप कुछ भी दोबारा नहीं कटता।" en="One payment. Nothing renews on its own." />
        </p>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-[2.3rem] font-bold leading-none tabular-nums">{price}</span>
          <span className="text-[0.9rem] font-medium text-on-gold/75">
            <T hi={`${months} महीने के लिए`} en={`for ${months} months`} />
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-2.5 pt-1">
        {GOLD_INCLUDES.map((r) => (
          <li key={r.en} className="flex gap-3 text-[0.92rem] leading-snug text-ink-2">
            <span aria-hidden className="flex-none font-bold text-gold-deep">
              ✓
            </span>
            <T hi={r.hi} en={r.en} />
          </li>
        ))}
      </ul>

      {error ? (
        <p role="alert" className="rounded-tile bg-pink/10 px-4 py-3 text-[0.9rem] font-medium text-pink">
          <T hi="Payment शुरू नहीं हो सका। थोड़ी देर बाद फिर कोशिश कीजिए।" en="The payment could not start. Please try again in a moment." />
        </p>
      ) : null}

      <Button full size="lg" disabled={busy} onClick={() => void pay()}>
        {busy ? <T hi="खुल रहा है…" en="Opening…" /> : <T hi="Gold सदस्य बनिए" en="Become a Gold member" />}
      </Button>
      {/* Declining is not a second call to action. A full-width button beside
          the real one asks the reader to choose between two equals, which is
          not what this moment is. */}
      <button type="button" onClick={onClose} className="mx-auto text-[0.9rem] text-ink-3 underline underline-offset-4">
        <T hi="अभी नहीं" en="Not now" />
      </button>

      <p className="flex items-center justify-center gap-1.5 pb-1 text-center text-[0.8rem] text-ink-3">
        <ShieldIcon className="h-4 w-4 flex-none text-violet" />
        <T hi="Payment Razorpay के ज़रिए होता है।" en="Payment processed by Razorpay." />
      </p>
    </Sheet>
  );
}
