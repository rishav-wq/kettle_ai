/*
  Renders the kettle mark into the favicon and the app icons.

    npx tsx scripts/make-logo.ts

  The geometry comes from src/lib/brand/kettle.ts, the same file the React
  component draws from, so the icon can never again be a different shape or
  colour from the logo in the header.

  White tile, Pine mark. The app's ground is white, so the icon matches it.
*/
import { writeFileSync } from "node:fs";
import path from "node:path";
import { kettleMarkup } from "../src/lib/brand/kettle";

export const PINE = "#00311F";
export const MILK = "#F0EEE6";
export const WHITE = "#FFFFFF";

function tile(scale: number, ground: string, mark: string): string {
  const inner = scale === 1 ? kettleMarkup() : `<g transform="translate(50 50) scale(${scale}) translate(-50 -50)">${kettleMarkup()}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${ground}"/>
  <g fill="${mark}">${inner}</g>
</svg>
`;
}

const pub = path.join(process.cwd(), "public");
writeFileSync(path.join(pub, "icon.svg"), tile(1, WHITE, PINE));
// Android crops a maskable icon to a circle, so the mark is inset to survive it.
writeFileSync(path.join(pub, "icon-maskable.svg"), tile(0.66, WHITE, PINE));
console.log("wrote public/icon.svg and public/icon-maskable.svg  (Pine on white)");
