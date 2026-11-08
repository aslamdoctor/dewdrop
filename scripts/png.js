// A small RGBA8 PNG encoder and a nearest-neighbour scaler for the art scripts.
import { deflateSync } from "node:zlib";

const CRC = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

export function encodePNG(width, height, rgba) {
  if (rgba.length !== width * height * 4) throw new Error(`encodePNG: want ${width * height * 4} bytes, got ${rgba.length}`);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // Each row starts with filter type 0 (none).
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function scaleNearest(width, height, rgba, k) {
  const w = width * k, h = height * k, out = new Uint8Array(w * h * 4);
  for (let y = 0; y < height; y++) {
    const row = new Uint8Array(w * 4);
    for (let x = 0; x < width; x++) {
      const px = rgba.subarray((y * width + x) * 4, (y * width + x) * 4 + 4);
      for (let i = 0; i < k; i++) row.set(px, (x * k + i) * 4);
    }
    for (let j = 0; j < k; j++) out.set(row, (y * k + j) * w * 4);
  }
  return { width: w, height: h, rgba: out };
}
