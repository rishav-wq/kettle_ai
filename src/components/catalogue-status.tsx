import { T } from "@/components/bilingual";
import { cn } from "@/lib/cn";

/*
  How much of the catalogue plays today.

  Gold unlocks every lesson, and most lessons are not filmed yet: they open the
  moment their video lands, which is the plan Rishav chose on 2026-09-23. It is
  a reasonable plan. It is only a problem if the buyer finds out afterwards.

  "Every lesson unlocked" is true and would be read as "every lesson is here".
  This line is the difference between a pre-order and a disappointment, and on a
  product whose first course teaches this audience to distrust a payment page
  that promises more than it shows, it is not optional.

  Both numbers are counted, never asserted. getCatalogStats already ignores a
  lesson whose video reference starts with TODO, because counting those once
  inflated the landing strip to "67 lessons" when two had video between them.
  They move on their own as videos are linked, so nothing here needs editing
  when the catalogue fills — including this line disappearing by itself once
  nothing is left to come.
*/

export function CatalogueStatus({
  ready,
  coming,
  className,
}: {
  /** Published lessons that actually play. Counted on the server. */
  ready: number;
  /** Published lessons still waiting for their video. Counted on the server. */
  coming: number;
  className?: string;
}) {
  if (coming <= 0) return null;

  return (
    <p
      className={cn(
        "rounded-tile border border-gold-line bg-gold-wash px-4 py-3 text-[0.88rem] leading-relaxed text-ink-2",
        className
      )}
    >
      <T
        hi={`${ready} lessons अभी देखने के लिए तैयार हैं। बाकी ${coming} अभी बन रहे हैं — Gold लेने पर वे यहीं खुलते जाएँगे, जैसे-जैसे तैयार होते जाएँगे। कोई अलग payment नहीं।`}
        en={`${ready} lessons play today. The other ${coming} are still being filmed — with Gold they open here as each one arrives, at no further cost.`}
      />
    </p>
  );
}
