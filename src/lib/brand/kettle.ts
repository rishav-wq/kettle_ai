/*
  The kettle mark, as geometry.

  One source. The React component in src/components/logo.tsx renders these
  paths inline so the mark inherits currentColor in a header, and
  scripts/make-logo.ts renders the same paths into the favicon, the app icons
  and the brand assets. They used to be four hand-copied drawings that drifted
  apart, which is how the icon ended up a different shape and colour from the
  logo.

  Traced from the source artwork. The body is the distinctive part: it is not a
  row of parallel bars but a fan, because the quadrilateral it fills has a left
  edge that leans harder than its right, so the stripes splay as they descend.
  Everything is expressed as a path so a consumer only ever renders <path>.

  Colour lives with the consumer, not here. The tile is white and the mark is
  Pine; on a dark panel the mark is Milk. See scripts/make-logo.ts.
*/

type Pt = readonly [number, number];

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const n = (v: number) => Math.round(v * 100) / 100;
const quad = (p0: Pt, p1: Pt, p2: Pt, p3: Pt) =>
  `M${n(p0[0])} ${n(p0[1])}L${n(p1[0])} ${n(p1[1])}L${n(p2[0])} ${n(p2[1])}L${n(p3[0])} ${n(p3[1])}Z`;

/** The body outline. The left edge leans further than the right, which is what makes the stripes fan. */
const TL: Pt = [40.5, 30.6];
const TR: Pt = [64.2, 35.2];
const BL: Pt = [25.4, 72.8];
const BR: Pt = [57.6, 80.6];

const STRIPE_COUNT = 8;
/** Share of each slot filled by Pine. The remainder is the gap the ground shows through. */
const STRIPE_FILL = 0.82;

const body = Array.from({ length: STRIPE_COUNT }, (_, i) => {
  const t0 = i / STRIPE_COUNT;
  const t1 = t0 + STRIPE_FILL / STRIPE_COUNT;
  return quad(lerp(TL, TR, t0), lerp(TL, TR, t1), lerp(BL, BR, t1), lerp(BL, BR, t0));
});

/** A circle, written as a path, so every element is the same kind. */
const dot = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;

/** A slanted lid band: a thin quadrilateral following the same lean as the body top. */
const band = (x0: number, y0: number, x1: number, y1: number, h: number) =>
  quad([x0, y0], [x1, y1], [x1, y1 + h], [x0, y0 + h]);

export const KETTLE_PATHS: readonly string[] = [
  // Handle: a solid petal on the left, detached from the body by a gap of ground.
  "M38.4 30.6L29.4 31.3C25.2 34.8 24.2 46.6 25.2 55.4C25.9 61 27.6 63.8 29.6 64.9L34.2 48.4Z",

  // Lid: three bands narrowing upward, then the knob.
  band(39.6, 29.2, 65.2, 34.1, 2.3),
  band(41.8, 25.6, 62.6, 29.6, 2.1),
  band(44.4, 22.2, 59.8, 25.2, 1.9),
  dot(53.4, 18.4, 1.9),

  // Body: eight stripes, fanning.
  ...body,

  // Spout: an S-curve off the right shoulder, with the notched tip from the artwork.
  "M60.6 57.6C67.4 56.4 71.4 51.4 73.8 44.6C75 41.2 76.2 39.3 78.4 38.4L80.9 40.7L78.2 42.6C76.9 46.8 76.3 53.6 73.6 59C70.8 64.6 66.2 68 60.6 69Z",
];

/** The whole mark, tilted the way the artwork is. Wrap in a group that sets the fill. */
export const KETTLE_TILT = "rotate(13 46 52)";

/*
  The tilted mark's own bounds, as a square viewBox.

  The paths are drawn inside a 0–100 field with a wide margin, which suits the
  app icon: a favicon needs air around the mark, and the icon scripts add their
  own. In a header it is the opposite problem — the margin made the mark render
  at about 60% of its box and put a band of empty canvas between it and the
  word, which read as a gap nobody had set.

  Measured from the transformed control points, so it is a hair loose and can
  never clip. Square, so any h-N w-N pair still gives a round mark.
*/
export const KETTLE_VIEWBOX = "20.9 20.3 62 62";

/** Markup for the non-React consumers. */
export function kettleMarkup(): string {
  return `<g transform="${KETTLE_TILT}">${KETTLE_PATHS.map((d) => `<path d="${d}"/>`).join("")}</g>`;
}
