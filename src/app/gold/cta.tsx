"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Paywall } from "@/components/paywall";

export function GoldCta({ months, signedIn }: { months: number; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button full size="lg" onClick={() => setOpen(true)}>
        Become a Gold member
      </Button>
      <Paywall
        open={open}
        onClose={() => setOpen(false)}
        reason="locked_lesson"
        from="gold"
        months={months}
        signedIn={signedIn}
      />
    </>
  );
}
