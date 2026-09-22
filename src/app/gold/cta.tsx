"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Paywall } from "@/components/paywall";

export function GoldCta({
  months,
  signedIn,
  price,
  listPrice,
  ready,
  coming,
}: {
  months: number;
  signedIn: boolean;
  price: string;
  listPrice: string | null;
  ready: number;
  coming: number;
}) {
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
        price={price}
        listPrice={listPrice}
        ready={ready}
        coming={coming}
        months={months}
        signedIn={signedIn}
      />
    </>
  );
}
