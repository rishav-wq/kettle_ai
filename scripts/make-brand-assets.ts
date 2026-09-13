/*
  Brand assets for places that are not the product: LinkedIn, WhatsApp previews,
  slides.

    node scripts/make-brand-assets.mjs

  Writes an SVG and a PNG of each. Upload the PNG. Keep the SVG, because it is
  the editable original and it renders in Anek when opened in a browser, where
  the web fonts are available.

  A caveat worth knowing: the PNG is rasterised here on the build machine, which
  does not have Anek installed, so its Devanagari falls back to a system face.
  The composition is right; the letterforms are not brand-exact. For a
  font-perfect PNG, open the SVG in a browser with the Anek fonts loaded and
  export from there.
*/
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { kettleMarkup } from "../src/lib/brand/kettle";

const PINE = "#00311F";
const MILK = "#F0EEE6";
const WHITE = "#FFFFFF";
const MUTED = "#5C7267";

const DV = "'Anek Devanagari','Nirmala UI','Noto Sans Devanagari',sans-serif";
const LATIN = "'Anek Latin','Segoe UI',system-ui,sans-serif";

/** The mark, from the single source in make-logo.mjs. */
function kettle(fill: string, transform: string): string {
  return `<g fill="${fill}" transform="${transform}">${kettleMarkup()}</g>`;
}

/*
  LinkedIn company cover: 1128 x 191.

  The logo tile overlaps the bottom-left corner, so nothing meaningful may sit
  left of about x=210. The panel edge leans at the same 14 degrees as the mark,
  which is the one gesture that ties the whole identity together.
*/
function linkedinBanner() {
  const W = 1128;
  const H = 191;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${WHITE}"/>

  <!-- Milk panel, right, with a leaning edge that echoes the kettle. The mark
       itself is always Pine: the logo is a green kettle, never a reversed one. -->
  <path d="M838 0 H${W} V${H} H790 Z" fill="${MILK}"/>
  ${kettle(PINE, "translate(893 33) scale(1.27)")}

  <!-- Milk keyline under the whole banner, so it reads as a card even on a white feed. -->
  <rect x="0" y="${H - 3}" width="790" height="3" fill="${MILK}"/>

  <text x="232" y="84" font-family="${DV}" font-size="35" font-weight="600" fill="${PINE}">AI से बात कीजिए, अपनी ही भाषा में।</text>
  <text x="232" y="122" font-family="${LATIN}" font-size="19" font-weight="600" fill="${MUTED}">Everyday AI, taught in Hindi, for people over 40.</text>
  <text x="232" y="152" font-family="${LATIN}" font-size="15" font-weight="700" fill="${PINE}" letter-spacing="1.6">FOUR LESSONS FREE · NO SIGNUP</text>
</svg>
`;
}

/*
  Open Graph card: 1200 x 630. What a Kettle link looks like when it is pasted
  into WhatsApp, which is where every referral in this product travels.
*/
function ogCard() {
  const W = 1200;
  const H = 630;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${WHITE}"/>
  <path d="M812 0 H${W} V${H} H700 Z" fill="${MILK}"/>
  ${kettle(PINE, "translate(830 210) scale(2.3)")}

  <g transform="translate(88 0)">
    ${kettle(PINE, "translate(0 92) scale(0.62)")}
    <text x="76" y="150" font-family="${LATIN}" font-size="42" font-weight="800" letter-spacing="-1.6" fill="${PINE}">kettle</text>

    <text x="0" y="268" font-family="${DV}" font-size="54" font-weight="600" fill="${PINE}">AI से बात कीजिए,</text>
    <text x="0" y="336" font-family="${DV}" font-size="54" font-weight="600" fill="${PINE}">अपनी ही भाषा में।</text>

    <text x="0" y="396" font-family="${LATIN}" font-size="25" font-weight="600" fill="${MUTED}">Everyday AI, taught in Hindi, for people over 40.</text>

    <rect x="0" y="440" width="470" height="62" rx="12" fill="${MILK}"/>
    <text x="26" y="480" font-family="${LATIN}" font-size="21" font-weight="700" fill="${PINE}">Four complete lessons, free. No account.</text>
  </g>
</svg>
`;
}

async function main() {
  const out = path.join(process.cwd(), "public", "brand");
  mkdirSync(out, { recursive: true });

  const assets = [
    // LinkedIn downsamples the cover, so ship it at 2x for crisp text.
    { name: "linkedin-banner", svg: linkedinBanner(), w: 2256, h: 382 },
    { name: "og-card", svg: ogCard(), w: 1200, h: 630 },
  ];

  for (const a of assets) {
    writeFileSync(path.join(out, `${a.name}.svg`), a.svg);
    // Rasterise generously, then resize to the exact target so the dimensions
    // are never at the mercy of how a renderer interprets SVG density.
    await sharp(Buffer.from(a.svg), { density: 300 })
      .resize(a.w, a.h, { fit: "fill" })
      .png({ compressionLevel: 9 })
      .toFile(path.join(out, `${a.name}.png`));
    console.log(`wrote public/brand/${a.name}  ${a.w}x${a.h}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
