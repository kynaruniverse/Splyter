/**
 * Generates the PWA icons into public/ from one drawn mark: a circle split into two halves
 * (blue = A, orange = B), nudged apart.
 *
 *   npm i -D sharp && node scripts/make-icons.cjs
 *
 * The PNGs are committed, so you only need this if you change the design.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const BG = '#0f1115';
const A = '#4aa3ff';
const B = '#ff9a3d';

/** size: pixel size. radius: mark radius as a fraction of size. rounded: round the background corners. */
function svg({ size, radius, rounded }) {
  const c = size / 2;
  const r = size * radius;
  const gap = r * 0.16; // space between the halves
  const dy = r * 0.1; // vertical nudge: A up, B down
  const corner = rounded ? size * 0.22 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <clipPath id="l"><rect x="0" y="0" width="${c - gap / 2}" height="${size}"/></clipPath>
    <clipPath id="r"><rect x="${c + gap / 2}" y="0" width="${size}" height="${size}"/></clipPath>
  </defs>
  <rect width="${size}" height="${size}" rx="${corner}" fill="${BG}"/>
  <g transform="translate(0 ${-dy})"><circle cx="${c}" cy="${c}" r="${r}" fill="${A}" clip-path="url(#l)"/></g>
  <g transform="translate(0 ${dy})"><circle cx="${c}" cy="${c}" r="${r}" fill="${B}" clip-path="url(#r)"/></g>
</svg>`;
}

const out = path.join(__dirname, '..', 'public');
fs.mkdirSync(path.join(out, 'icons'), { recursive: true });

const jobs = [
  // "any" icons: rounded tile, mark fills most of it.
  { file: 'icons/icon-192.png', size: 192, radius: 0.34, rounded: true },
  { file: 'icons/icon-512.png', size: 512, radius: 0.34, rounded: true },
  // Maskable: full-bleed background, mark kept well inside the 80% safe zone.
  { file: 'icons/icon-maskable-512.png', size: 512, radius: 0.27, rounded: false },
  // iOS rounds the corners itself, so the touch icon is a full-bleed square.
  { file: 'icons/apple-touch-icon.png', size: 180, radius: 0.32, rounded: false },
];

(async () => {
  for (const j of jobs) {
    await sharp(Buffer.from(svg(j))).png().toFile(path.join(out, j.file));
    console.log('wrote', j.file);
  }
  fs.writeFileSync(path.join(out, 'favicon.svg'), svg({ size: 64, radius: 0.34, rounded: true }));
  console.log('wrote favicon.svg');
})();
