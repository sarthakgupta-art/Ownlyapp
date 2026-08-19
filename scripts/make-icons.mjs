#!/usr/bin/env node
/**
 * Generates the app icon set.
 *
 * The mark is an "O" — Ownly's initial, and the simplest possible form for a
 * fragrance house: a thin champagne ring on near-black. It is drawn here rather
 * than shipped as a design file so the whole set regenerates from one place
 * when the palette moves, and so the repo has no binary assets nobody can edit.
 *
 * Written against `node:zlib` only. Pulling in a raster library for four flat
 * images would be a heavier dependency than the images are worth.
 *
 *   npm run icons
 *
 * Replace these with a designed logo when one exists — a real wordmark will
 * always beat a generated monogram. Nothing else needs to change: the paths in
 * app.json stay the same.
 */

import { deflateSync } from 'node:zlib';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = resolve(ROOT, 'assets');

// Kept in sync with src/theme/tokens.ts by hand; there are only two.
const INK = [0x11, 0x11, 0x11];
const CHAMPAGNE = [0x9a, 0x7b, 0x4f];
const PAPER = [0xfb, 0xf9, 0xf6];

/* -------------------------------------------------------------------------- */
/* Minimal PNG encoder                                                         */
/* -------------------------------------------------------------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** Encodes RGBA pixel data as a PNG. */
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Each scanline is prefixed with its filter type; 0 (none) compresses well
  // enough for flat artwork and keeps this readable.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* -------------------------------------------------------------------------- */
/* Drawing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Renders the ring mark.
 *
 * Coverage is computed from each pixel's distance to the ring's centre-line, so
 * the edge is antialiased rather than stepped — at 1024px a hard edge is
 * clearly visible on the curve.
 */
function drawRing({ size, background, ringColor, ringRadiusRatio, ringWidthRatio, transparent = false }) {
  const rgba = Buffer.alloc(size * size * 4);
  const centre = (size - 1) / 2;
  const radius = size * ringRadiusRatio;
  const halfWidth = (size * ringWidthRatio) / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - centre;
      const dy = y - centre;
      const distanceToRing = Math.abs(Math.sqrt(dx * dx + dy * dy) - radius);

      // Fade across one pixel either side of the stroke edge.
      const coverage = Math.max(0, Math.min(1, halfWidth + 0.5 - distanceToRing));

      const offset = (y * size + x) * 4;
      const baseAlpha = transparent ? 0 : 255;

      rgba[offset] = Math.round(background[0] * (1 - coverage) + ringColor[0] * coverage);
      rgba[offset + 1] = Math.round(background[1] * (1 - coverage) + ringColor[1] * coverage);
      rgba[offset + 2] = Math.round(background[2] * (1 - coverage) + ringColor[2] * coverage);
      rgba[offset + 3] = Math.round(baseAlpha * (1 - coverage) + 255 * coverage);
    }
  }
  return encodePng(size, size, rgba);
}

/* -------------------------------------------------------------------------- */

const targets = [
  {
    file: 'icon.png',
    note: 'iOS / store listing',
    png: () =>
      drawRing({ size: 1024, background: INK, ringColor: CHAMPAGNE, ringRadiusRatio: 0.3, ringWidthRatio: 0.022 }),
  },
  {
    // Android crops the foreground to a shape of the launcher's choosing, so
    // the mark sits well inside the 66% safe zone.
    file: 'adaptive-icon.png',
    note: 'Android adaptive foreground',
    png: () =>
      drawRing({
        size: 1024,
        background: INK,
        ringColor: CHAMPAGNE,
        ringRadiusRatio: 0.2,
        ringWidthRatio: 0.016,
        transparent: true,
      }),
  },
  {
    file: 'splash-icon.png',
    note: 'splash screen',
    png: () =>
      drawRing({
        size: 512,
        background: INK,
        ringColor: CHAMPAGNE,
        ringRadiusRatio: 0.3,
        ringWidthRatio: 0.024,
        transparent: true,
      }),
  },
  {
    file: 'favicon.png',
    note: 'web',
    png: () =>
      drawRing({ size: 64, background: PAPER, ringColor: INK, ringRadiusRatio: 0.3, ringWidthRatio: 0.06 }),
  },
];

await mkdir(ASSETS, { recursive: true });

for (const target of targets) {
  const png = target.png();
  await writeFile(resolve(ASSETS, target.file), png);
  console.log(`  ${target.file.padEnd(20)} ${String(png.length).padStart(7)} bytes   ${target.note}`);
}

console.log('\nIcons written to assets/. Replace with a designed logo when available.\n');
