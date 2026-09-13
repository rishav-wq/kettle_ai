"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/**
 * The moment after paying.
 *
 * Entitlement comes from the server, so this waits for it rather than
 * asserting it. Razorpay's browser callback fires before the webhook has
 * necessarily arrived, and trusting the callback would let the client grant
 * itself a membership.
 *
 * If the wait runs long we stop spinning and say so, because a person who has
 * just paid and sees a spinner forever will phone someone.
 */
export function SuccessSheet({ name, alreadyGold }: { name: string | null; alreadyGold: boolean }) {
  const router = useRouter();
  const [gold, setGold] = useState(alreadyGold);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (gold) return;
    let tries = 0;
    const id = setInterval(async () => {
      tries += 1;
      try {
        const res = await fetch("/api/payments/status", { credentials: "same-origin", cache: "no-store" });
        if (((await res.json()) as { state?: string }).state === "gold") {
          setGold(true);
          clearInterval(id);
          router.refresh();
          return;
        }
      } catch {
        // A dropped request on a weak connection is expected; keep polling.
      }
      if (tries >= 20) {
        setSlow(true);
        clearInterval(id);
      }
    }, 1500);
    return () => clearInterval(id);
  }, [gold, router]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 backdrop-blur-[2px]">
      <div className="flex w-full max-w-[520px] flex-col gap-4 rounded-t-[28px] bg-paper px-5 pb-[calc(22px+env(safe-area-inset-bottom))] pt-4 shadow-l">
        <div aria-hidden className="mx-auto mb-1 h-1.5 w-11 rounded-full bg-line" />

        {gold ? (
          <>
            <span aria-hidden className="text-[2.4rem] leading-none">🎉</span>
            <h1 className="text-[1.5rem] font-bold leading-tight">
              {name ? `${name}, you are` : "You are"} a Kettle Gold member
            </h1>
            <p className="leading-relaxed text-ink-2">Every course is open. Carry on from where you stopped.</p>
            <Button href="/learn" full size="lg">
              Start learning
            </Button>
          </>
        ) : slow ? (
          <>
            <h1 className="text-[1.35rem] font-bold">Confirming your payment</h1>
            <p className="leading-relaxed text-ink-2">
              If the money has left your account, membership opens within a few minutes. You can close this page.
            </p>
            <Button href="/learn" full variant="soft">
              All right
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-[1.35rem] font-bold">One moment…</h1>
            <p className="leading-relaxed text-ink-2">We are confirming the payment.</p>
            <div aria-hidden className="h-2 overflow-hidden rounded-full bg-wash">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-violet" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
