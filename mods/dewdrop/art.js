// Paths to the mod's art, relative to the Herdr home.
export const ART = "mods/dewdrop/art";
export const art = (name) => `${ART}/${name}.svg`;
export const png = (name) => `${ART}/${name}.png`;
// A picture from CAST (its `file`, e.g. "portrait" or "cast/07").
export const pic = (file) => png(file);
export const petFrame = (pet, frame) => png(`pets/${pet}-${frame}`);
// A pet's animated walk, facing "l" or "r" (scripts/draw-motion.js).
export const petWalk = (pet, dir) => `${ART}/pets/${pet}-walk-${dir}.webp`;
// A two-frame action, played: dir is "l" or "r".
export const petDo = (pet, dir) => `${ART}/pets/${pet}-do-${dir}.webp`;

export { PET_FRAMES } from "./pets.js";
