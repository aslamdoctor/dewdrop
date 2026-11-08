// Paths to the mod's art, relative to the Herdr home.
export const ART = "mods/dewdrop/art";
export const art = (name) => `${ART}/${name}.svg`;
export const png = (name) => `${ART}/${name}.png`;
// A picture from CAST (its `file`, e.g. "portrait" or "cast/07").
export const pic = (file) => png(file);
export const petFrame = (pet, frame) => png(`pets/${pet}-${frame}`);

// Each pet's frames: a walk pair and one action. Moves to pets.js in Task 10.
export const PET_FRAMES = {
  chicken: ["a", "b", "act"], duck: ["a", "b", "act"], cat: ["a", "b", "nap"], dog: ["a", "b", "wag"],
  rabbit: ["a", "hop", "act"], turtle: ["a", "b", "hide"], frog: ["a", "hop", "act"],
};
