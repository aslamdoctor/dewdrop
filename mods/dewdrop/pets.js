// The pet cast: seven pets, their frames and the line shown in the picker.
// The saved choice lives in the shared key "dewdrop.pet": a pet key, or the word NO_PET for no pet (unset means chicken).

// Each pet's frames: a walk pair and one action (art/pets/<pet>-<frame>.png).
export const PET_FRAMES = {
  chicken: ["a", "b", "act"], duck: ["a", "b", "act"], cat: ["a", "b", "nap"], dog: ["a", "b", "wag"],
  rabbit: ["a", "hop", "act"], turtle: ["a", "b", "hide"], frog: ["a", "hop", "act"],
};

// How each pet walks the road: speed in px per second and ms per walk frame
// (art/pets/<pet>-walk-l.webp and -r.webp, made by scripts/draw-motion.js).
export const PET_WALK = {
  chicken: { speed: 50, ms: 260 }, duck: { speed: 36, ms: 300 }, cat: { speed: 44, ms: 280 }, dog: { speed: 90, ms: 250 },
  rabbit: { speed: 70, ms: 300 }, turtle: { speed: 14, ms: 300 }, frog: { speed: 60, ms: 300 },
};

export const PET_KEYS = ["chicken", "duck", "cat", "dog", "rabbit", "turtle", "frog"];

const INFO = {
  chicken: ["Chicken", "Wanders about and pecks. Click for a heart."],
  duck: ["Duck", "Slow waddle. Quacks when you poke it."],
  cat: ["Cat", "Naps a lot, sudden dashes. Picky about pats."],
  dog: ["Dog", "Zooms around, wags. Jumps when patted."],
  rabbit: ["Rabbit", "Hops, stops to nibble. Flips when clicked."],
  turtle: ["Turtle", "Very slow. Hides in its shell when poked."],
  frog: ["Frog", "Sits still, then leaps. Croaks when poked."],
};

export const PETS = Object.fromEntries(PET_KEYS.map((k) => [k, { name: INFO[k][0], trait: INFO[k][1], frames: PET_FRAMES[k] }]));

// A known pet key, null for "no pet", and the default (chicken) for anything else.
export function petKey(v) {
  if (v === null) return null;
  return typeof v === "string" && Object.hasOwn(PETS, v) ? v : "chicken";
}

// shared() reports a key nobody has set as null, the same as a stored null, so "no pet"
// is saved as this word and an unset key keeps the default pet.
export const NO_PET = "none";

// The pet to show for a raw shared("dewdrop.pet") value: the default when unset, null for NO_PET.
export function savedPet(raw) {
  if (raw === undefined || raw === null) return "chicken";
  return raw === NO_PET ? null : petKey(raw);
}
