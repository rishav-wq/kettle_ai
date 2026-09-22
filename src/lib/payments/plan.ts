import { env } from "@/lib/env";

/*
  The one plan.

  A single one-time payment for a fixed period, not a recurring subscription.
  For this audience prepaid matches how people already buy, and it removes an
  entire class of failure: expired cards, failed renewals, and the support load
  that comes with both.

  The price is a product decision that has not been made. These are the knobs.
*/
export const GOLD = {
  amountPaise: env.GOLD_PRICE_PAISE,
  /*
    What Gold costs when it is not a launch price. Display only — nothing is
    ever charged from this, and the order endpoint does not read it. Unset
    means no regular price is shown. See src/components/price.tsx for why it
    defaults to off.
  */
  listPaise: env.GOLD_LIST_PRICE_PAISE ?? null,
  months: env.GOLD_MONTHS,
  currency: "INR" as const,
};

/** "₹149" for display. Paise are the unit of record everywhere else. */
export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return `₹${Number.isInteger(rupees) ? rupees : rupees.toFixed(2)}`;
}

let warnedAboutList = false;

/*
  The regular price to show struck through, already formatted, or null.

  Server only, because it reads env — see the note in src/components/price.tsx
  for what happened when the browser tried to work this out for itself.

  A list price at or below the amount actually charged is a mistake rather than
  a decision, so it is dropped and explained. Almost always the same mistake:
  the variable is in paise and someone typed rupees, so 5999 means fifty nine
  rupees. The symptom is a number that simply does not appear anywhere on the
  page, which on its own tells you nothing.
*/
export function goldListPrice(): string | null {
  const list = GOLD.listPaise;
  if (!list) return null;

  if (list <= GOLD.amountPaise) {
    if (!warnedAboutList) {
      warnedAboutList = true;
      const ifRupees = list * 100;
      console.error(
        `[plan] GOLD_LIST_PRICE_PAISE is ${list} paise, which is ${formatRupees(list)}. ` +
          `That is not above GOLD_PRICE_PAISE (${GOLD.amountPaise} paise, ${formatRupees(GOLD.amountPaise)}), ` +
          `so no regular price is shown.` +
          (ifRupees > GOLD.amountPaise ? ` This value is in PAISE, not rupees. Did you mean ${ifRupees}?` : "")
      );
    }
    return null;
  }

  return formatRupees(list);
}

export function validUntilFrom(start: Date): Date {
  const end = new Date(start);
  end.setMonth(end.getMonth() + GOLD.months);
  return end;
}
