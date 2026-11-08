// Paths to the mod's art, relative to the Herdr home.
export const ART = "mods/dewdrop/art";
export const art = (name) => `${ART}/${name}.svg`;
export const png = (name) => `${ART}/${name}.png`;
// A picture from CAST (its `file`, e.g. "portrait" or "cast/07").
export const pic = (file) => png(file);
export const petFrame = (pet, frame) => png(`pets/${pet}-${frame}`);

export { PET_FRAMES } from "./pets.js";
