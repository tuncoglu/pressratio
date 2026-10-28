// Generates the PWA icons (no dependencies): a die plate — cream disc, dark holes.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [43, 29, 18];
const DISC = [243, 224, 190];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const mix = (a, b, t) => a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));
const cover = (d, r) => Math.min(1, Math.max(0, r - d + 0.5)); // 1px antialias

function png(size, scale) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const c = size / 2;
  const R = size * 0.38 * scale;
  const holes = [[0, 0]];
  for (let i = 0; i < 6; i++) holes.push([Math.cos((i * Math.PI) / 3) * R * 0.58, Math.sin((i * Math.PI) / 3) * R * 0.58]);
  const hr = R * 0.14;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let px = BG;
      px = mix(px, DISC, cover(Math.hypot(x + 0.5 - c, y + 0.5 - c), R));
      for (const [hx, hy] of holes) px = mix(px, BG, cover(Math.hypot(x + 0.5 - c - hx, y + 0.5 - c - hy), hr));
      raw.set(px, y * (size * 3 + 1) + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192, 1.15));
writeFileSync('public/icons/icon-512.png', png(512, 1.15));
// Maskable: keep the artwork inside the central safe zone.
writeFileSync('public/icons/icon-maskable-512.png', png(512, 0.85));
console.log('icons written');
