/*
  Interface icons.

  Drawn rather than pulled from a font, so they inherit currentColor, cost no
  request, and share one weight. Each takes a `filled` flag so the tab bar can
  show state without a second set of files.
*/

type Props = { className?: string; filled?: boolean };

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function BookIcon({ className, filled }: Props) {
  // A stack of lines, not an open book: the two-page version reads as a pause
  // button at 20px, which is exactly the wrong signal in a video product.
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {filled ? (
        <>
          <rect x="3.5" y="5" width="6" height="6" rx="2" fill="currentColor" />
          <rect x="3.5" y="13" width="6" height="6" rx="2" fill="currentColor" />
          <rect x="11.5" y="6.2" width="9" height="2.6" rx="1.3" fill="currentColor" />
          <rect x="11.5" y="11" width="9" height="2.6" rx="1.3" fill="currentColor" />
          <rect x="11.5" y="15.8" width="6" height="2.6" rx="1.3" fill="currentColor" />
        </>
      ) : (
        <>
          <rect x="3.6" y="5.1" width="5.8" height="5.8" rx="2" {...stroke} />
          <rect x="3.6" y="13.1" width="5.8" height="5.8" rx="2" {...stroke} />
          <path d="M12.4 7.5h8M12.4 12.3h8M12.4 17.1h5" {...stroke} />
        </>
      )}
    </svg>
  );
}

export function BookmarkIcon({ className, filled }: Props) {
  const d = "M6.5 4.2h11a1 1 0 0 1 1 1v14.3l-6.5-3.8-6.5 3.8V5.2a1 1 0 0 1 1-1Z";
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {filled ? <path d={d} fill="currentColor" /> : <path d={d} {...stroke} />}
    </svg>
  );
}

export function StarIcon({ className, filled }: Props) {
  const d = "M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.8-5.2-2.75L6.8 19.6l1-5.8-4.2-4.1 5.8-.85Z";
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {filled ? <path d={d} fill="currentColor" /> : <path d={d} {...stroke} />}
    </svg>
  );
}

export function HeartIcon({ className, filled }: Props) {
  const d = "M12 20s-7.2-4.35-7.2-9.3A4.2 4.2 0 0 1 12 8.1a4.2 4.2 0 0 1 7.2 2.6C19.2 15.65 12 20 12 20Z";
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {filled ? <path d={d} fill="currentColor" /> : <path d={d} {...stroke} />}
    </svg>
  );
}

export function PersonIcon({ className, filled }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {filled ? (
        <>
          <circle cx="12" cy="8" r="4" fill="currentColor" />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0Z" fill="currentColor" />
        </>
      ) : (
        <>
          <circle cx="12" cy="8" r="3.6" {...stroke} />
          <path d="M5 20a7 7 0 0 1 14 0" {...stroke} />
        </>
      )}
    </svg>
  );
}

export function SearchIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="11" cy="11" r="6.6" {...stroke} />
      <path d="M16 16l4 4" {...stroke} />
    </svg>
  );
}

export function PlayIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M8.5 5.6v12.8l10-6.4Z" fill="currentColor" />
    </svg>
  );
}

export function ShieldIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 3l7 2.6v5.2c0 4.4-3 7.6-7 9.2-4-1.6-7-4.8-7-9.2V5.6Z" {...stroke} />
      <path d="M8.8 11.9l2.3 2.3 4.1-4.3" {...stroke} />
    </svg>
  );
}

export function LockIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2" {...stroke} />
      <path d="M8.2 10.5V7.9a3.8 3.8 0 0 1 7.6 0v2.6" {...stroke} />
    </svg>
  );
}

export function ChatIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M20 12.4c0 3.8-3.6 6.9-8 6.9a9.4 9.4 0 0 1-2.6-.36L4.6 20.4l1.1-3.5A6.6 6.6 0 0 1 4 12.4C4 8.6 7.6 5.5 12 5.5s8 3.1 8 6.9Z" {...stroke} />
    </svg>
  );
}

export function HelpIcon({ className }: Props) {
  // A question mark inside a ring. The sidebar drew a literal "?" character
  // next to five SVG icons, which sat on a different baseline and carried the
  // body font's weight rather than the icon set's.
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" {...stroke} />
      <path d="M9.4 9.3a2.7 2.7 0 1 1 3.3 2.9c-.5.2-.8.6-.8 1.1v.6" {...stroke} />
      <circle cx="12" cy="16.8" r="1.05" fill="currentColor" />
    </svg>
  );
}

export function PencilIcon({ className }: Props) {
  // The catalogue editor. Same reason as HelpIcon: it was a "✎" glyph.
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M4 20h4L19.2 8.8a2.1 2.1 0 0 0 0-3L18.2 4.8a2.1 2.1 0 0 0-3 0L4 16v4Z" {...stroke} />
      <path d="M14.5 5.5 18.5 9.5" {...stroke} />
    </svg>
  );
}
