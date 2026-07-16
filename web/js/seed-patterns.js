// Initial-condition seed patterns, independent of the CA rule. "Random" is
// density-settable; the others give reproducible symmetric starting points
// (useful for studying a rule's behavior in isolation, or as a blank canvas
// for the paint tool).

import { CROSS_HEX_NEIGHBOR, NUM_SECTORS } from "./lattice.js";

export const SEED_PATTERNS = [
  { id: "random", name: "Random (density-settable)" },
  { id: "blank", name: "Blank (for painting)" },
  { id: "single", name: "Single triangle" },
  { id: "center-hex", name: "Center hex (all 12 sectors)" },
  { id: "six-ring", name: "Six-fold ring" },
];

export const DEFAULT_SEED_PATTERN_ID = "random";
export const DEFAULT_DENSITY = 0.05;

/**
 * Applies `patternId` to `engine`, centered at hex (0, 0) — the point the
 * camera's default view (`Camera.resetView`, world origin) actually looks
 * at, not the grid array's arithmetic index-center `(width/2, height/2)`.
 * The lattice is toroidal (no true "middle"), so any fixed point is an
 * equally valid "center" — the one that matters is wherever the camera
 * happens to be looking, so the pattern is actually visible without having
 * to pan hundreds of cells away to find it. `density` only affects "random".
 */
export function applySeedPattern(engine, patternId, { density = DEFAULT_DENSITY } = {}) {
  applySeedPatternAt(engine, patternId, 0, 0, { density, clearFirst: true });
}

/**
 * Stamps `patternId` centered at `(centerQ, centerR)` without clearing the
 * rest of the grid first (unless `clearFirst` is set) — used by "place
 * mode" to drop a pattern wherever the user clicks, possibly several times
 * in different spots. "random" and "blank" ignore the position and always
 * apply to the whole grid (they are not really "placeable" patterns).
 */
export function applySeedPatternAt(engine, patternId, centerQ, centerR, { density = DEFAULT_DENSITY, clearFirst = false } = {}) {
  const highState = Math.max(1, engine.numStates - 1);

  switch (patternId) {
    case "random":
      engine.seedRandom(density);
      return;
    case "blank":
      engine.fillConstant(0);
      return;
    case "single":
      if (clearFirst) engine.fillConstant(0);
      engine.setCell(centerQ, centerR, 0, highState);
      return;
    case "center-hex":
      if (clearFirst) engine.fillConstant(0);
      for (let sector = 0; sector < NUM_SECTORS; sector++) {
        engine.setCell(centerQ, centerR, sector, highState);
      }
      return;
    case "six-ring": {
      if (clearFirst) engine.fillConstant(0);
      for (let sector = 0; sector < NUM_SECTORS; sector++) {
        engine.setCell(centerQ, centerR, sector, highState);
      }
      const uniqueDirections = [...new Map(CROSS_HEX_NEIGHBOR.map((d) => [`${d.dq},${d.dr}`, d])).values()];
      uniqueDirections.forEach((direction, index) => {
        const state = index % 2 === 0 ? highState : Math.max(1, highState - 1);
        for (let sector = 0; sector < NUM_SECTORS; sector++) {
          engine.setCell(centerQ + direction.dq, centerR + direction.dr, sector, state);
        }
      });
      return;
    }
    default:
      throw new Error(`unknown seed pattern "${patternId}"`);
  }
}

/** Whether `patternId` can be stamped at a specific location (as opposed to always covering the whole grid). */
export function isPlaceablePattern(patternId) {
  return patternId === "single" || patternId === "center-hex" || patternId === "six-ring";
}
