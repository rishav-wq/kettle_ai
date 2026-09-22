import { T } from "@/components/bilingual";
import { cn } from "@/lib/cn";

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
  exactly that move. So GOLD_LIST_PRICE_PAISE is unset by default and unset
  shows no strike: setting it asserts that the higher number is the real price
  and the lower one is a launch price. If Gold never goes to the list price, the
  strike has to come off.

  Both numbers arrive already formatted, and that is the whole point of this
  component's shape.

  It renders inside the paywall sheet, which is a client component. Resolving
  the plan here instead pulls src/lib/env into the browser bundle, where
  process.env carries nothing that is not NEXT_PUBLIC_ — so every value falls
  back to its schema default. That is not hypothetical: it shipped. The sheet
  drew ₹3499 from the default rather than from GOLD_PRICE_PAISE, which looked
  right only because the two happened to match, and drew no regular price at all
  because GOLD_LIST_PRICE_PAISE has no default to fall back to. A price change
  would have left the sheet advertising one number while the server charged
  another, and nothing would have failed.

  So the server resolves both and passes them down. Nothing about money is
  decided in the browser.

  The term is not on this line. "for 12 months" used to sit where the regular
  price now sits, and both do not fit on a phone without one of them wrapping.
  It has not been dropped: "Everything unlocked for 12 months" is the second
  item in GOLD_INCLUDES, which renders directly beneath this on both the Gold
  page and the sheet, so the duration is still stated on every screen that
  shows a price.

  Reads correctly aloud. The <s> element carries the "no longer applies" meaning
  to assistive technology, and the visually hidden label names what the number
  is, so a screen reader says "Regular price five thousand nine hundred and
  ninety nine" rather than reading two prices with nothing to tell them apart.
*/

export function Price({
  price,
  listPrice,
  size = "sheet",
  className,
}: {
  /** Already formatted, e.g. "₹3499". Resolved on the server, never here. */
  price: string;
  /** Already formatted, or null for no strike. Resolved on the server. */
  listPrice?: string | null;
  size?: "page" | "sheet";
  className?: string;
}) {
  return (
    <div className={cn("mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span className={cn(size === "page" ? "text-[2.6rem]" : "text-[2.3rem]", "font-bold leading-none tabular-nums")}>
        {price}
      </span>

      {listPrice ? (
        <s className="text-[1.25rem] font-semibold tabular-nums text-on-gold/60 decoration-on-gold/60 decoration-[1.5px]">
          <span className="sr-only">
            <T hi="नियमित मूल्य " en="Regular price " />
          </span>
          {listPrice}
        </s>
      ) : null}
    </div>
  );
}
