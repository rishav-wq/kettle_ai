"use client";

import { useState } from "react";
import { Button, OtpInput, Sheet } from "@/components/ui";

/** Client-only pieces of the kit: OTP entry and the bottom sheet. */
export function KitInteractive() {
  const [otp, setOtp] = useState("402");
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="flex flex-col gap-4">
        <h2 className="text-[1.05rem] font-bold">OTP input</h2>
        <OtpInput value={otp} onChange={setOtp} />
        <p className="text-[0.85rem] text-ink-3">Tap the boxes and type. Paste and SMS autofill also work.</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[1.05rem] font-bold">Bottom sheet</h2>
        <Button variant="soft" onClick={() => setOpen(true)}>
          Open the paywall sheet
        </Button>
        <Sheet open={open} onClose={() => setOpen(false)} title="Become a Gold member">
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-violet">Kettle Gold</span>
          <h3 className="text-[1.3rem] font-bold leading-tight">Keep going, every course opens</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-[2.2rem] font-bold leading-none tabular-nums text-violet">₹—</span>
            <span className="text-[0.9rem] font-medium text-ink-3">price to be decided</span>
          </div>
          <Button full size="lg">
            Pay with UPI
          </Button>
          <Button full variant="soft" onClick={() => setOpen(false)}>
            Not now
          </Button>
        </Sheet>
      </section>
    </>
  );
}
