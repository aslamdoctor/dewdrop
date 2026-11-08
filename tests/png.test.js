import { test, expect } from "bun:test";
import { encodePNG, scaleNearest } from "../scripts/png.js";

test("encodePNG writes a valid header with the right size", () => {
  const b = encodePNG(3, 2, new Uint8Array(3 * 2 * 4).fill(255));
  expect([...b.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect([b.readUInt32BE(16), b.readUInt32BE(20)]).toEqual([3, 2]);
});

test("scaleNearest repeats each pixel k times", () => {
  const r = scaleNearest(1, 1, new Uint8Array([1, 2, 3, 4]), 2);
  expect([r.width, r.height]).toEqual([2, 2]);
  expect([...r.rgba]).toEqual([1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4]);
});
