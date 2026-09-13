/*
  Placeholder course art, in the Pine system.

    node scripts/make-demo-art.mjs

  Flat shapes on a tinted ground, one per course, drawn from each subject so a
  grid of them reads as a set. Real photographs or commissioned illustration
  should replace these; when they do, delete this script and its output.

  Deliberately simple rather than isometric. An isometric set drawn by hand
  would be uneven, and uneven illustration looks worse than none.
*/
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/*
  Two colours on Milk, matching the art already checked in: Pine carries the
  subject, the soft green carries the secondary shapes, white is anything that
  reads as paper or a screen.

  The constants here used to name a violet system this project no longer uses,
  which meant re-running the script would have overwritten good art with the
  wrong palette.
*/
const PINE = "#00311F";
const SOFT = "#5C806F";
const GROUND = "#F0EEE6";
const WHITE = "#FFFFFF";

const W = 320;
const H = 240;

/** Each entry paints on a GROUND rectangle. Keep shapes flat and few. */
const art = {
  "talk-to-ai": `
    <rect x="52" y="58" width="150" height="82" rx="20" fill="${PINE}"/>
    <path d="M84 140 L84 168 L112 140 Z" fill="${PINE}"/>
    <circle cx="96" cy="99" r="8" fill="${WHITE}"/><circle cx="127" cy="99" r="8" fill="${WHITE}"/><circle cx="158" cy="99" r="8" fill="${WHITE}"/>
    <rect x="150" y="112" width="122" height="70" rx="18" fill="${SOFT}"/>
    <path d="M240 182 L240 206 L216 182 Z" fill="${SOFT}"/>
    <rect x="168" y="134" width="86" height="9" rx="4.5" fill="${WHITE}"/>
    <rect x="168" y="152" width="56" height="9" rx="4.5" fill="${WHITE}"/>`,

  "spot-a-scam": `
    <path d="M160 44 L238 70 v54 c0 40 -34 66 -78 80 c-44 -14 -78 -40 -78 -80 V70 Z" fill="${PINE}"/>
    <path d="M132 122 l19 19 l38 -40" fill="none" stroke="${WHITE}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="52" cy="62" r="11" fill="${SOFT}"/>
    <circle cx="268" cy="62" r="11" fill="${SOFT}"/>
    <circle cx="40" cy="150" r="7" fill="${SOFT}"/>
    <circle cx="280" cy="150" r="7" fill="${SOFT}"/>`,

  "ai-in-whatsapp": `
    <rect x="98" y="30" width="124" height="180" rx="26" fill="${PINE}"/>
    <rect x="110" y="52" width="100" height="136" rx="14" fill="${WHITE}"/>
    <rect x="122" y="70" width="62" height="24" rx="12" fill="${SOFT}"/>
    <rect x="136" y="104" width="62" height="24" rx="12" fill="${GROUND}"/>
    <rect x="122" y="138" width="76" height="24" rx="12" fill="${SOFT}"/>
    <circle cx="160" cy="198" r="6" fill="${WHITE}"/>`,

  "plan-a-pooja": `
    <path d="M160 48 c17 28 32 43 32 64 a32 32 0 0 1 -64 0 c0 -21 15 -36 32 -64 Z" fill="${SOFT}"/>
    <path d="M74 148 h172 c0 28 -39 44 -86 44 s-86 -16 -86 -44 Z" fill="${PINE}"/>
    <rect x="58" y="140" width="204" height="10" rx="5" fill="${PINE}"/>
    <circle cx="56" cy="80" r="10" fill="${SOFT}"/><circle cx="264" cy="80" r="10" fill="${SOFT}"/>
    <circle cx="38" cy="116" r="6" fill="${SOFT}"/><circle cx="282" cy="116" r="6" fill="${SOFT}"/>`,

  "write-a-letter": `
    <rect x="62" y="62" width="196" height="128" rx="18" fill="${WHITE}"/>
    <path d="M62 78 L160 144 L258 78" fill="none" stroke="${PINE}" stroke-width="11" stroke-linejoin="round" stroke-linecap="round"/>
    <rect x="62" y="62" width="196" height="128" rx="18" fill="none" stroke="${PINE}" stroke-width="10"/>
    <path d="M214 26 l30 30 -52 52 -38 8 8 -38 Z" fill="${SOFT}"/>`,

  "write-a-resume": `
    <rect x="86" y="30" width="148" height="180" rx="20" fill="${WHITE}"/>
    <rect x="86" y="30" width="148" height="180" rx="20" fill="none" stroke="${PINE}" stroke-width="9"/>
    <circle cx="128" cy="74" r="18" fill="${PINE}"/>
    <rect x="156" y="62" width="58" height="10" rx="5" fill="${SOFT}"/>
    <rect x="156" y="82" width="40" height="10" rx="5" fill="${GROUND}"/>
    <rect x="108" y="120" width="106" height="10" rx="5" fill="${SOFT}"/>
    <rect x="108" y="142" width="86" height="10" rx="5" fill="${GROUND}"/>
    <rect x="108" y="164" width="66" height="10" rx="5" fill="${GROUND}"/>`,

  /* The ten below stand in for courses that have no video yet. */

  "ask-better-questions": `
    <circle cx="160" cy="106" r="60" fill="${PINE}"/>
    <path d="M141 88 a20 20 0 1 1 21 30 v10" fill="none" stroke="${WHITE}" stroke-width="12" stroke-linecap="round"/>
    <circle cx="162" cy="140" r="7" fill="${WHITE}"/>
    <rect x="76" y="186" width="168" height="11" rx="5.5" fill="${SOFT}"/>
    <rect x="106" y="208" width="108" height="11" rx="5.5" fill="${SOFT}"/>`,

  "ai-on-your-phone": `
    <rect x="104" y="26" width="112" height="188" rx="24" fill="${PINE}"/>
    <rect x="116" y="48" width="88" height="144" rx="12" fill="${WHITE}"/>
    <circle cx="160" cy="106" r="26" fill="none" stroke="${SOFT}" stroke-width="11"/>
    <path d="M160 92 v28 M146 106 h28" stroke="${PINE}" stroke-width="9" stroke-linecap="round"/>
    <rect x="132" y="152" width="56" height="10" rx="5" fill="${SOFT}"/>
    <circle cx="160" cy="203" r="6" fill="${WHITE}"/>`,

  "safe-online-payments": `
    <rect x="46" y="70" width="228" height="126" rx="18" fill="${WHITE}"/>
    <rect x="46" y="70" width="228" height="126" rx="18" fill="none" stroke="${PINE}" stroke-width="10"/>
    <rect x="46" y="98" width="228" height="24" fill="${PINE}"/>
    <path d="M78 158 l20 20 l44 -46" fill="none" stroke="${PINE}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="166" y="150" width="80" height="11" rx="5.5" fill="${SOFT}"/>
    <rect x="166" y="170" width="52" height="11" rx="5.5" fill="${SOFT}"/>`,

  "strong-passwords": `
    <rect x="82" y="106" width="156" height="112" rx="22" fill="${PINE}"/>
    <path d="M116 106 v-24 a44 44 0 0 1 88 0 v24" fill="none" stroke="${SOFT}" stroke-width="16"/>
    <circle cx="128" cy="162" r="10" fill="${WHITE}"/>
    <circle cx="160" cy="162" r="10" fill="${WHITE}"/>
    <circle cx="192" cy="162" r="10" fill="${WHITE}"/>`,

  "fake-photos-and-forwards": `
    <rect x="48" y="52" width="180" height="132" rx="16" fill="${WHITE}"/>
    <rect x="48" y="52" width="180" height="132" rx="16" fill="none" stroke="${PINE}" stroke-width="10"/>
    <path d="M64 158 l44 -46 l30 30 l26 -24 l40 40 Z" fill="${SOFT}"/>
    <circle cx="96" cy="88" r="13" fill="${SOFT}"/>
    <circle cx="222" cy="160" r="42" fill="none" stroke="${PINE}" stroke-width="13"/>
    <path d="M252 190 l26 26" stroke="${PINE}" stroke-width="15" stroke-linecap="round"/>`,

  "meals-and-shopping": `
    <path d="M74 108 h172 l-18 96 a14 14 0 0 1 -14 12 h-108 a14 14 0 0 1 -14 -12 Z" fill="${PINE}"/>
    <path d="M112 108 a48 48 0 0 1 96 0" fill="none" stroke="${SOFT}" stroke-width="14"/>
    <rect x="58" y="92" width="204" height="18" rx="9" fill="${SOFT}"/>
    <circle cx="132" cy="156" r="9" fill="${WHITE}"/>
    <circle cx="188" cy="156" r="9" fill="${WHITE}"/>`,

  "health-questions": `
    <path d="M160 46 L236 72 v50 c0 38 -32 62 -76 76 c-44 -14 -76 -38 -76 -76 V72 Z" fill="${PINE}"/>
    <path d="M160 88 v56 M132 116 h56" stroke="${WHITE}" stroke-width="16" stroke-linecap="round"/>
    <circle cx="52" cy="96" r="10" fill="${SOFT}"/>
    <circle cx="268" cy="96" r="10" fill="${SOFT}"/>`,

  "travel-and-tickets": `
    <path d="M52 84 h216 v40 a18 18 0 0 0 0 36 v40 H52 v-40 a18 18 0 0 0 0 -36 Z" fill="${PINE}"/>
    <path d="M160 92 v28 M160 132 v28 M160 172 v28" stroke="${GROUND}" stroke-width="8" stroke-linecap="round" stroke-dasharray="2 18"/>
    <rect x="80" y="116" width="58" height="11" rx="5.5" fill="${WHITE}"/>
    <rect x="80" y="140" width="40" height="11" rx="5.5" fill="${SOFT}"/>
    <path d="M190 142 h56 m-18 -16 l18 16 l-18 16" fill="none" stroke="${WHITE}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`,

  "government-forms": `
    <rect x="80" y="26" width="160" height="188" rx="18" fill="${WHITE}"/>
    <rect x="80" y="26" width="160" height="188" rx="18" fill="none" stroke="${PINE}" stroke-width="10"/>
    <rect x="104" y="58" width="86" height="11" rx="5.5" fill="${PINE}"/>
    <rect x="104" y="86" width="112" height="11" rx="5.5" fill="${SOFT}"/>
    <rect x="104" y="112" width="92" height="11" rx="5.5" fill="${SOFT}"/>
    <circle cx="196" cy="176" r="34" fill="none" stroke="${PINE}" stroke-width="11"/>
    <path d="M180 176 l12 12 l22 -24" fill="none" stroke="${PINE}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`,

  "bills-and-budget": `
    <ellipse cx="160" cy="72" rx="72" ry="24" fill="${SOFT}"/>
    <path d="M88 72 v40 c0 13 32 24 72 24 s72 -11 72 -24 V72" fill="${PINE}"/>
    <path d="M88 116 v40 c0 13 32 24 72 24 s72 -11 72 -24 v-40" fill="${PINE}"/>
    <path d="M88 160 v40 c0 13 32 24 72 24 s72 -11 72 -24 v-40" fill="${PINE}"/>
    <path d="M136 92 h48 m-48 18 h48 m-40 -30 v46 m0 -12 c22 0 22 -22 0 -22" fill="none" stroke="${WHITE}" stroke-width="7" stroke-linecap="round"/>`,
};

const dir = path.join(process.cwd(), "public", "courses");
mkdirSync(dir, { recursive: true });

function write(id, shapes, height) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" width="${W}" height="${height}" role="img" aria-hidden="true">
  <rect width="${W}" height="${height}" fill="${GROUND}"/>${shapes}
</svg>
`;
  writeFileSync(path.join(dir, `${id}.svg`), svg);
  console.log(`wrote public/courses/${id}.svg`);
}

for (const [id, shapes] of Object.entries(art)) write(id, shapes, H);
