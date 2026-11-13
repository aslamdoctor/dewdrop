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

import { avatarIndex, withAvatar } from "../mods/dewdrop/cast.js";

test("avatarIndex reads the space's avatar, else the global picture", () => {
  const map = { s1: 4, s2: 99 };
  expect(avatarIndex(map, "s1", 7)).toBe(4);
  expect(avatarIndex(map, "s2", 7)).toBe(7);
  expect(avatarIndex(map, "s3", 7)).toBe(7);
  expect(avatarIndex(map, null, 7)).toBe(7);
  expect(avatarIndex(map, "toString", 7)).toBe(7);
  for (const bad of [null, undefined, "x", 3, [1]]) expect(avatarIndex(bad, "s1", 2)).toBe(2);
  expect(avatarIndex(null, "s1", undefined)).toBe(0);
});

test("withAvatar sets one space without touching the others", () => {
  const before = { s1: 4 };
  expect(withAvatar(before, "s2", 9)).toEqual({ s1: 4, s2: 9 });
  expect(before).toEqual({ s1: 4 });
  expect(withAvatar(undefined, "s1", 3)).toEqual({ s1: 3 });
  expect(withAvatar([5], "s1", 3)).toEqual({ s1: 3 });
});

import { PET_KEYS, PETS, PET_FRAMES, petKey, savedPet } from "../mods/dewdrop/pets.js";

test("petKey keeps known pets and none, else chicken", () => {
  expect(petKey("frog")).toBe("frog");
  expect(petKey(null)).toBeNull();
  for (const v of [undefined, "dragon", 3]) expect(petKey(v)).toBe("chicken");
  expect(PET_KEYS.every((k) => PETS[k].frames === PET_FRAMES[k] && PETS[k].name && PETS[k].trait)).toBe(true);
});

test("savedPet: unset keeps the default, the word none means no pet", () => {
  expect(savedPet(null)).toBe("chicken");
  expect(savedPet(undefined)).toBe("chicken");
  expect(savedPet("none")).toBeNull();
  expect(savedPet("cat")).toBe("cat");
  expect(savedPet(7)).toBe("chicken");
});

import { PET_WALK } from "../mods/dewdrop/pets.js";

test("every pet walks, the turtle slowest and the dog quickest", () => {
  expect(Object.keys(PET_WALK).sort()).toEqual([...PET_KEYS].sort());
  const speeds = Object.values(PET_WALK).map((w) => w.speed);
  expect(PET_WALK.turtle.speed).toBe(Math.min(...speeds));
  expect(PET_WALK.dog.speed).toBe(Math.max(...speeds));
  for (const w of Object.values(PET_WALK)) {
    expect(w.speed).toBeLessThanOrEqual(100);
    expect(w.ms).toBeWithin(250, 301);
  }
});
