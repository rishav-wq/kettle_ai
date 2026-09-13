import Link from "next/link";
import { cn } from "@/lib/cn";
import { KETTLE_PATHS, KETTLE_TILT, KETTLE_VIEWBOX } from "@/lib/brand/kettle";

/*
  The kettle mark.

  Inline rather than an <img> so it inherits currentColor, costs no request,
  and stays sharp from 28px in a header to 512px as an app icon.

  The geometry lives in src/lib/brand/kettle.ts, shared with the script that
  writes the favicon and the brand assets, so the icon can never drift into a
  different shape from the logo again.
*/
export function KettleMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={KETTLE_VIEWBOX}
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="currentColor"
    >
      {title ? <title>{title}</title> : null}
      <g transform={KETTLE_TILT}>
        {KETTLE_PATHS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

/*
  The mark beside the name. Used in every header and as the home link.

  Three sizes rather than two. `lg` is for the marketing header, where the
  wordmark is the only thing establishing who this is and has a whole band to
  itself; at `md` it was reading as a favicon next to a 68px headline. It grows
  at lg: the same 26px that looks right on a laptop crowds a 360px phone.
*/
/*
  The mark now fills its box, so these are smaller and sit closer to the word
  than the same numbers would have before. Roughly 1.3x the cap height of the
  text beside them, which is where a mark stops competing with the name.
*/
const SIZES = {
  sm: { mark: "h-6 w-6", text: "text-[18px]", gap: "gap-2" },
  md: { mark: "h-7 w-7", text: "text-[21px]", gap: "gap-2" },
  lg: { mark: "h-8 w-8 lg:h-9 lg:w-9", text: "text-[23px] lg:text-[27px]", gap: "gap-2 lg:gap-2.5" },
} as const;

export function Wordmark({
  href = "/",
  className,
  size = "md",
  name = "kettle ai",
}: {
  href?: string | null;
  className?: string;
  size?: keyof typeof SIZES;
  name?: string;
}) {
  const s = SIZES[size];
  const inner = (
    <>
      <KettleMark className={cn("flex-none text-current", s.mark)} />
      <span className={cn("font-display font-extrabold tracking-[-0.04em] text-current", s.text)}>{name}</span>
    </>
  );
  const classes = cn("flex items-center", s.gap, className);

  if (!href) return <span className={classes}>{inner}</span>;
  return (
    <Link href={href} className={classes} aria-label="Kettle AI home">
      {inner}
    </Link>
  );
}

/*
  Two icons drawn rather than typed.

  Emoji were rendering as hollow system glyphs that fought the two-colour rule
  and looked broken next to Devanagari. These inherit currentColor like the mark.
*/

export function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12 1.6 20 4.6v6.2c0 4.9-3.3 8.9-8 10.6-4.7-1.7-8-5.7-8-10.6V4.6Z" />
      <path d="M8.4 11.6 11 14.2l4.8-4.9" fill="none" stroke="var(--paper)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12 2.6c-5.2 0-9.4 3.5-9.4 7.9 0 2.5 1.4 4.7 3.5 6.2l-.9 4.1 4.3-2.2c.8.2 1.7.3 2.5.3 5.2 0 9.4-3.5 9.4-7.9S17.2 2.6 12 2.6Z" />
    </svg>
  );
}
