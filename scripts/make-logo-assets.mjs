/*
  Turns the two exported brand PNGs into usable logo assets.

    node scripts/make-logo-assets.mjs

  The exports are square, padded, and each has a baked-in background: 1.png is
  the pine mark on milk, 2.png is the milk mark on pine. Neither can sit on an
  arbitrary surface — dropped onto the white sidebar, 1.png shows as a visible
  milk square.

  So each is separated into mark and background. Alpha is derived from how far
  a pixel has travelled from the background colour toward the mark colour,
  which preserves the anti-aliased edges instead of hard-thresholding them into
  a jagged outline. Every surviving pixel is then set to the mark colour flat,
  so a slightly-off export cannot drift the brand colour.

  Output is trimmed to the artwork and written at 192px. The largest place it
  renders is 46px, so 192 covers a 4x screen; 512 was four times the file size
  for pixels no display can show.
*/
import sharp from "sharp";
import path from "node:path";

const BRAND = path.join(process.cwd(), "public", "brand");

const PINE = { r: 0, g: 49, b: 31 };
const MILK = { r: 240, g: 238, b: 230 };

const luma = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

/**
 * @param source  file to read
 * @param mark    the colour the kettle is drawn in
 * @param ground  the colour behind it
 * @param out     file to write
 */
async function separate(source, mark, ground, out) {
  const { data, info } = await sharp(path.join(BRAND, source))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const from = luma(ground);
  const to = luma(mark);
  const span = to - from;

  const pixels = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    // 0 where the pixel still matches the background, 1 where it has fully
    // become the mark. Anti-aliased edges land in between and stay smooth.
    const t = Math.max(0, Math.min(1, (l - from) / span));
    pixels[i] = mark.r;
    pixels[i + 1] = mark.g;
    pixels[i + 2] = mark.b;
    pixels[i + 3] = Math.round(t * 255);
  }

  await sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer()
    .then((buf) =>
      sharp(buf)
        // Drop the padding around the artwork so the mark fills its box and
        // the gap to the wordmark is a gap we chose, not leftover canvas.
        .trim({ threshold: 1 })
        .resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toFile(path.join(BRAND, out))
    );

  const meta = await sharp(path.join(BRAND, out)).metadata();
  console.log(`${out.padEnd(20)} ${meta.width}x${meta.height}  ${(meta.size / 1024).toFixed(0)}kb`);
}

// 1.png: pine kettle on a milk square -> pine kettle, transparent.
await separate("1.png", PINE, MILK, "kettle-pine.png");
// 2.png: milk kettle on a pine square -> milk kettle, transparent.
await separate("2.png", MILK, PINE, "kettle-milk.png");
