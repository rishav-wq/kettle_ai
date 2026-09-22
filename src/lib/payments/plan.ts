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

export function validUntilFrom(start: Date): Date {
  const end = new Date(start);
  end.setMonth(end.getMonth() + GOLD.months);
  return end;
}
