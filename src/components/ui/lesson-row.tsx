import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = {
  index: number;
  title: string;
  meta: string;
  /** 0 to 1. Drawn as a thin bar under the title rather than filling the row. */
  progress?: number;
  done?: boolean;
  current?: boolean;
  locked?: boolean;
  href?: string;
  /**
   * Instead of a link. A locked lesson has nowhere useful to go, so the row
   * becomes a button that opens the paywall where the reader already is.
   * Only a client component can pass this.
   */
  onClick?: () => void;
};

/**
 * A lesson in a list.
 *
 * The number sits in a rounded violet square, the state is carried by that
 * square rather than by the whole row, and progress is a thin bar beneath the
 * title. The previous design filled the entire row with colour; on a white
 * card that reads as a selection, which is not what it means.
 */
export function LessonRow({ index, title, meta, progress = 0, done, current, locked, href, onClick }: Props) {
  const pct = Math.round(Math.max(0, Math.min(1, done ? 1 : progress)) * 100);

  const inner = (
    <>
      <span
        className={cn(
          "grid h-11 w-11 flex-none place-items-center rounded-[14px] text-[0.95rem] font-semibold tabular-nums",
          done ? "bg-violet text-white" : current ? "bg-wash text-violet" : locked ? "bg-line-2 text-ink-3" : "bg-wash text-violet"
        )}
      >
        {done ? "✓" : locked ? "🔒" : index}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.98rem] font-semibold leading-snug text-ink">{title}</span>
        <span className="mt-0.5 block text-[0.8rem] leading-snug text-ink-3">{meta}</span>
        {pct > 0 && pct < 100 ? (
          <span aria-hidden className="mt-2 block h-1.5 overflow-hidden rounded-full bg-line-2">
            <span className="block h-full rounded-full bg-violet" style={{ width: `${pct}%` }} />
          </span>
        ) : null}
      </span>

      <span aria-hidden className="flex-none text-[1.1rem] leading-none text-ink-3">
        {locked ? "" : "›"}
      </span>
    </>
  );

  const classes = cn(
    "flex w-full min-h-[76px] items-center gap-3.5 rounded-tile bg-paper px-4 py-3 text-left shadow-s transition-shadow",
    (href || onClick) && "hover:shadow-m",
    current && "ring-2 ring-violet/35"
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-current={current ? "true" : undefined}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {inner}
      </button>
    );
  }
  return <div className={classes}>{inner}</div>;
}
