import { T } from "@/components/bilingual";
import { cn } from "@/lib/cn";
import { GOLD, formatRupees } from "@/lib/payments/plan";

/*
  The price, with the regular price struck through beside it.

  CLAUDE.md says "No urgency, ever", and names a struck-through price as one of
  the things that rule forbids. Rishav decided on 2026-09-23 to show one, so
  this is the declared exception and the rule now says so. The rest of that rule
  stands: no countdown, no "offer ends", no timer.

  What makes the difference between this and the thing the rule was written
  against is whether the struck number was ever real. A reference price nobody
  could have paid is a fabricated comparison, and India's consumer protection
  authority treats it as a dark pattern — on the one screen that asks this
  audience for money, in a product whose first course teaches them to recognise
  exactly that move. So:

    GOLD_LIST_PRICE_PAISE is unset by default, and unset shows no strike at all.
    Setting it is the assertion that the higher number is the real price and the
    lower one is a launch price. That assertion has to stay true — if Gold never
    goes to the list price, the strike has to come off.

  A list price at or below the amount actually charged is a mistake rather than
  a decision, so it is ignored and logged instead of rendered.

  The term is not on this line. "for 12 months" used to sit where the regular
  price now sits, and both do not fit on a phone without one of them wrapping.
  It has not been dropped: "Everything unlocked for 12 months" is the second
  item in GOLD_INCLUDES, which renders directly beneath this on both the Gold
  page and the sheet, so the duration is still stated on every screen that
  shows the price.

  Reads correctly aloud. The <s> element carries the "no longer applies" meaning
  to assistive technology, and the visually hidden label names what the number
  is, so a screen reader says "Regular price five thousand nine hundred and
  ninety nine" rather than reading two prices with nothing to tell them apart.
*/

let warned = false;

export function listPricePaise(): number | null {
  const list = GOLD.listPaise;
  if (!list) return null;
  if (list <= GOLD.amountPaise) {
    if (!warned) {
      warned = true;
      /*
        Almost always the same mistake: the variable is in paise and someone
        typed rupees, so 5999 means fifty nine rupees and lands under the price
        being charged. Say which it is, because the symptom is a number that
        simply does not appear anywhere.
      */
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
  return list;
}

export function Price({ size = "sheet", className }: { size?: "page" | "sheet"; className?: string }) {
  const list = listPricePaise();
  const big = size === "page" ? "text-[2.6rem]" : "text-[2.3rem]";

  return (
    <div className={cn("mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span className={cn(big, "font-bold leading-none tabular-nums")}>{formatRupees(GOLD.amountPaise)}</span>

      {list ? (
        <s className="text-[1.25rem] font-semibold tabular-nums text-on-gold/60 decoration-on-gold/60 decoration-[1.5px]">
          <span className="sr-only">
            <T hi="नियमित मूल्य " en="Regular price " />
          </span>
          {formatRupees(list)}
        </s>
      ) : null}

    </div>
  );
}
