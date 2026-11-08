import { test, expect } from "bun:test";
import { CAST, faceOf, pictureIndex } from "../mods/dewdrop/cast.js";

test("cast has the user first and 24 farmhands in order", () => {
  expect(CAST).toHaveLength(25);
  expect(CAST[0]).toEqual({ name: "Aslam Doctor", role: "Developer", file: "portrait" });
  expect(CAST[1]).toEqual({ name: "Orion Vale", role: "Hacker", file: "cast/01" });
  expect(CAST[24]).toEqual({ name: "BEEP-09", role: "Robot", file: "cast/24" });
  expect(CAST[19].name).toBe("Milo Patches");
});

test("faceOf maps apps and falls back", () => {
  expect(faceOf("claude-code").name).toBe("Orion Vale");
  expect(faceOf("codex").name).toBe("Unit K-47");
  expect(faceOf("opencode").name).toBe("BEEP-09");
  expect(faceOf("pi").name).toBe("Milo Patches");
  expect(faceOf(null).name).toBe("Milo Patches");
});

test("pictureIndex clamps bad stored values to 0", () => {
  expect(pictureIndex(7)).toBe(7);
  for (const v of [undefined, null, -1, 25, 2.5, "3", {}]) expect(pictureIndex(v)).toBe(0);
});
