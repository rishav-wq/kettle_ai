"use client";

import { Button } from "@/components/ui";
import { T } from "@/components/bilingual";
import { useGoldCheckout } from "@/components/use-gold-checkout";

/*
  The button on /gold goes straight to checkout.

  It used to open the paywall sheet, which repeats the price, the term and the
  five benefits — everything the page above it had just said. On a phone that
  meant the whole pitch twice, page then sheet, before Razorpay appeared. The
  sheet is for a locked lesson, where the page around it is about the lesson
  and the pitch has to arrive with the ask. Here the page is the pitch.

  A signed-out reader is sent to sign in and brought back to this page, which
  the hook does on its own. There is nothing to explain first: they pressed a
  button that says what it does.
*/
export function GoldCta({ months, signedIn }: { months: number; signedIn: boolean }) {
  const { pay, busy, error } = useGoldCheckout({ signedIn, months });

  return (
    <div className="flex flex-col gap-3">
      <Button full size="lg" disabled={busy} onClick={() => void pay()}>
        {busy ? <T hi="खुल रहा है…" en="Opening…" /> : <T hi="Gold सदस्य बनिए" en="Become a Gold member" />}
      </Button>
      {error ? (
        <p role="alert" className="rounded-tile bg-pink/10 px-4 py-3 text-center text-[0.9rem] font-medium text-pink">
          <T hi="Payment शुरू नहीं हो सका। थोड़ी देर बाद फिर कोशिश कीजिए।" en="The payment could not start. Please try again in a moment." />
        </p>
      ) : null}
    </div>
  );
}
