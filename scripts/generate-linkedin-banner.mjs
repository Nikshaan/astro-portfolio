import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const portraitSrc = path.join(root, "src/data/bee.avif");
const outPath = path.join(root, "public/linkedin_banner.webp");

const WIDTH = 1200;
const HEIGHT = 630;
const PORTRAIT = 360;
const PORTRAIT_LEFT = 140;
const PORTRAIT_TOP = Math.round((HEIGHT - PORTRAIT) / 2);
const PORTRAIT_CENTER_X = PORTRAIT_LEFT + PORTRAIT / 2;
const PORTRAIT_CENTER_Y = PORTRAIT_TOP + PORTRAIT / 2;

const circleMask = Buffer.from(
  `<svg width="${PORTRAIT}" height="${PORTRAIT}"><circle cx="${PORTRAIT / 2}" cy="${PORTRAIT / 2}" r="${PORTRAIT / 2 - 2}" fill="white"/></svg>`,
);

const portrait = await sharp(portraitSrc)
  .resize(PORTRAIT, PORTRAIT, { fit: "cover" })
  .composite([{ input: circleMask, blend: "dest-in" }])
  .png()
  .toBuffer();

const TEXT_X = 620;
const TEXT_Y = 310;
const TEXT_SIZE = 96;
const UNDERLINE_Y = 340;
const UNDERLINE_HEIGHT = 4;
const UNDERLINE_X = TEXT_X;
const UNDERLINE_WIDTH = WIDTH - UNDERLINE_X;

const overlay = Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#14111c"/>
    </linearGradient>
    <radialGradient id="glow" cx="72%" cy="42%" r="42%">
      <stop offset="0%" stop-color="#a78bfa" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#a78bfa" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  <circle
    cx="${PORTRAIT_CENTER_X}"
    cy="${PORTRAIT_CENTER_Y}"
    r="${PORTRAIT / 2 + 3}"
    fill="none"
    stroke="#a78bfa"
    stroke-width="4"
  />
  <circle
    cx="${PORTRAIT_CENTER_X}"
    cy="${PORTRAIT_CENTER_Y}"
    r="${PORTRAIT / 2 + 8}"
    fill="none"
    stroke="#262626"
    stroke-width="2"
  />
  <text
    x="${TEXT_X}"
    y="${TEXT_Y}"
    font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
    font-size="${TEXT_SIZE}"
    font-weight="500"
    fill="#fafaf9"
    letter-spacing="-1"
  >Nikshaan</text>
  <rect
    x="${UNDERLINE_X}"
    y="${UNDERLINE_Y}"
    width="${UNDERLINE_WIDTH}"
    height="${UNDERLINE_HEIGHT}"
    rx="2"
    fill="#a78bfa"
  />
</svg>`);

await sharp({
  create: {
    width: WIDTH,
    height: HEIGHT,
    channels: 4,
    background: { r: 10, g: 10, b: 10, alpha: 1 },
  },
})
  .composite([
    { input: overlay, top: 0, left: 0 },
    { input: portrait, top: PORTRAIT_TOP, left: PORTRAIT_LEFT },
  ])
  .webp({ quality: 92 })
  .toFile(outPath);

console.log(`Wrote ${outPath}`);
