// The user plus 24 farmhands, in picker order. Pure data, no imports.
const HANDS = [
  ["Orion Vale", "Hacker"], ["Atlas Reed", "Archaeologist"], ["Professor Volt", "Eccentric Scientist"], ["Lord Vesper", "Vampire"],
  ["Kael Nova", "Bounty Hunter"], ["Raven Cross", "Secret Agent"], ["Sylvan Ashwood", "Elven Archer"], ["Ragnar Stonefist", "Barbarian"],
  ["Elara Moonspell", "Sorceress"], ["Sir Aldric", "Knight"], ["Nyx Shadowstep", "Rogue"], ["Bramble Ironforge", "Dwarf"],
  ["Axel Forge", "Genius"], ["Nightclaw", "Vigilante"], ["Nova Starling", "Cosmic Hero"], ["Unit K-47", "Cyborg"],
  ["Zorak Venn", "Alien"], ["Flashpoint Jett", "Speedster"], ["Milo Patches", "Handyman"], ["Kenzo Blaze", "Martial Artist"],
  ["Dorian Wolfsbane", "Monster Hunter"], ["Zara Flint", "Explorer"], ["Kaito Ember", "Ninja"], ["BEEP-09", "Robot"],
];

export const CAST = [
  { name: "Aslam Doctor", role: "Developer", file: "portrait" },
  ...HANDS.map(([name, role], i) => ({ name, role, file: `cast/${String(i + 1).padStart(2, "0")}` })),
];

// One face per app (CAST indexes).
export const APP_FACE = { "claude-code": 1, codex: 16, opencode: 24 };
export const FALLBACK_FACE = 19;

export function faceOf(app) {
  return CAST[(app != null && Object.hasOwn(APP_FACE, app) ? APP_FACE[app] : null) ?? FALLBACK_FACE];
}

export function pictureIndex(v) {
  return Number.isInteger(v) && v >= 0 && v <= 24 ? v : 0;
}

// Avatars are stored per space as { [spaceId]: castIndex } under "dewdrop.avatars".
const isMap = (v) => v != null && typeof v === "object" && !Array.isArray(v);

// The space's avatar, or the global picture when it has none (or a bad one).
export function avatarIndex(map, spaceId, fallback) {
  const v = isMap(map) && spaceId != null && Object.hasOwn(map, spaceId) ? map[spaceId] : null;
  return Number.isInteger(v) && v >= 0 && v <= 24 ? v : pictureIndex(fallback);
}

// A copy of the map with this space's avatar set.
export function withAvatar(map, spaceId, i) {
  return { ...(isMap(map) ? map : {}), [spaceId]: i };
}
