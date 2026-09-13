"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Paywall } from "@/components/paywall";

export function GoldCta({ price, months, signedIn }: { price: string; months: number; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button full size="lg" onClick={() => setOpen(true)}>
        Become a Gold member
      </Button>
      <Paywall open={open} onClose={() => setOpen(false)} reason="locked_lesson" price={price} months={months} signedIn={signedIn} />
    </>
  );
}
