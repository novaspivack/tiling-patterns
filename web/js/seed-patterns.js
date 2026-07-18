// Initial-condition seed patterns, independent of the CA rule. "Random" and
// "random-island" are density-settable; the others give reproducible
// starting points (useful for studying a rule's behavior in isolation, for
// comparing how many states it actually exercises, or as a blank canvas for
// the paint tool).

import { NUM_SECTORS, SQRT3 } from "./lattice.js";

export const SEED_PATTERNS = [
  { id: "random", name: "Random (density-settable)" },
  { id: "blank", name: "Blank (for painting)" },
  { id: "single", name: "Single triangle" },
  { id: "center-hex", name: "Center hex (all 12 sectors)" },
  { id: "six-ring", name: "Six-fold ring" },
  { id: "rainbow-ring", name: "Rainbow ring (one color per petal)" },
  { id: "sector-wheel", name: "Sector wheel (one color per triangle)" },
  { id: "ring-target", name: "Ring target (concentric color bands)" },
  { id: "spiral", name: "Spiral arms" },
  { id: "twin-blooms", name: "Twin blooms (two seeds)" },
  { id: "checkerboard", name: "Checkerboard field" },
  { id: "random-island", name: "Random island (density-settable)" },
  { id: "random-ultra-sparse-1", name: "Ultra-sparse scatter (0.5%)" },
  { id: "random-ultra-sparse-2", name: "Ultra-sparse scatter (0.2%)" },
  { id: "random-ultra-sparse-3", name: "Ultra-sparse scatter (0.05%)" },
];

// Fixed densities for the "ultra-sparse scatter" presets above — deliberately
// well below DEFAULT_DENSITY, for testing how a rule nucleates/grows (or
// doesn't) from a near-empty field rather than the default's already-fairly-
// visible scatter.
const ULTRA_SPARSE_DENSITY = { "random-ultra-sparse-1": 0.005, "random-ultra-sparse-2": 0.002, "random-ultra-sparse-3": 0.0005 };

export const DEFAULT_SEED_PATTERN_ID = "random";
export const DEFAULT_DENSITY = 0.02;

// The lattice's 6 unique cross-hex step directions, in canonical
// angular order (each consecutive pair is a 60° turn) — used for
// hex-distance, ring enumeration, and the spiral pattern below. Derived
// from `CROSS_HEX_NEIGHBOR`'s (dq, dr) values, which are exactly the
// standard 6 axial hex-grid unit directions.
const HEX_DIRECTIONS = [
  { dq: 1, dr: 0 },
  { dq: 1, dr: -1 },
  { dq: 0, dr: -1 },
  { dq: -1, dr: 0 },
  { dq: -1, dr: 1 },
  { dq: 0, dr: 1 },
];

function hexDistance(dq, dr) {
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

/** Axial (q, r) to cartesian, matching `render.js`'s `hexCenter` convention (only the angle is used here, so the scale/rotation choice doesn't need to match pixel-for-pixel — just be self-consistent). */
function hexCenterXY(q, r) {
  return { x: SQRT3 * q + (SQRT3 * 0.5) * r, y: 1.5 * r };
}

/** All hexes at exactly `radius` steps from the origin, in connected ring order (radius 0 => just the origin). */
function hexRing(radius) {
  if (radius === 0) return [{ dq: 0, dr: 0 }];
  const hexes = [];
  let dq = HEX_DIRECTIONS[4].dq * radius;
  let dr = HEX_DIRECTIONS[4].dr * radius;
  for (let side = 0; side < 6; side++) {
    const direction = HEX_DIRECTIONS[side];
    for (let step = 0; step < radius; step++) {
      hexes.push({ dq, dr });
      dq += direction.dq;
      dr += direction.dr;
    }
  }
  return hexes;
}

/** All hexes within `radius` steps of the origin (inclusive), origin first. */
function hexDisk(radius) {
  const hexes = [];
  for (let r = 0; r <= radius; r++) hexes.push(...hexRing(r));
  return hexes;
}

function setHex(engine, q, r, state) {
  for (let sector = 0; sector < NUM_SECTORS; sector++) {
    engine.setCell(q, r, sector, state);
  }
}

/** A nonzero state cycling through `1 .. numStates - 1` (falls back to the single available nonzero state when `numStates` is 2). */
function cycleState(numStates, index) {
  const span = Math.max(1, numStates - 1);
  return 1 + (((index % span) + span) % span);
}

/**
 * Applies `patternId` to `engine`, centered at hex (0, 0) — the point the
 * camera's default view (`Camera.resetView`, world origin) actually looks
 * at, not the grid array's arithmetic index-center `(width/2, height/2)`.
 * The lattice is toroidal (no true "middle"), so any fixed point is an
 * equally valid "center" — the one that matters is wherever the camera
 * happens to be looking, so the pattern is actually visible without having
 * to pan hundreds of cells away to find it. `density` only affects
 * "random" and "random-island".
 */
export function applySeedPattern(engine, patternId, { density = DEFAULT_DENSITY } = {}) {
  applySeedPatternAt(engine, patternId, 0, 0, { density, clearFirst: true });
}

/**
 * Stamps `patternId` centered at `(centerQ, centerR)` without clearing the
 * rest of the grid first (unless `clearFirst` is set) — used by "place
 * mode" to drop a pattern wherever the user clicks, possibly several times
 * in different spots. "random", "blank", and "checkerboard" ignore the
 * position and always apply to the whole grid (they are not really
 * "placeable" patterns — see `isPlaceablePattern`).
 */
export function applySeedPatternAt(engine, patternId, centerQ, centerR, { density = DEFAULT_DENSITY, clearFirst = false } = {}) {
  const numStates = engine.numStates;
  const highState = Math.max(1, numStates - 1);

  switch (patternId) {
    case "random":
      engine.seedRandom(density);
      return;
    case "random-ultra-sparse-1":
    case "random-ultra-sparse-2":
    case "random-ultra-sparse-3":
      engine.seedRandom(ULTRA_SPARSE_DENSITY[patternId]);
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
      setHex(engine, centerQ, centerR, highState);
      return;
    case "six-ring": {
      if (clearFirst) engine.fillConstant(0);
      setHex(engine, centerQ, centerR, highState);
      hexRing(1).forEach((offset, index) => {
        const state = index % 2 === 0 ? highState : Math.max(1, highState - 1);
        setHex(engine, centerQ + offset.dq, centerR + offset.dr, state);
      });
      return;
    }
    case "rainbow-ring": {
      // Like "six-ring", but each of the 6 petals gets a *distinct* state
      // (cycling through every nonzero state available) instead of just
      // alternating between 2 — a much better exercise of a k > 3 rule.
      if (clearFirst) engine.fillConstant(0);
      setHex(engine, centerQ, centerR, highState);
      hexRing(1).forEach((offset, index) => {
        setHex(engine, centerQ + offset.dq, centerR + offset.dr, cycleState(numStates, index));
      });
      return;
    }
    case "sector-wheel": {
      // A single hex whose 12 triangle sectors each get a different state
      // (cycling through every nonzero state) — the smallest pattern that
      // still shows every state a k-state rule has, side by side.
      if (clearFirst) engine.fillConstant(0);
      for (let sector = 0; sector < NUM_SECTORS; sector++) {
        engine.setCell(centerQ, centerR, sector, cycleState(numStates, sector));
      }
      return;
    }
    case "ring-target": {
      // Concentric rings of hexes out to radius 6, each ring a different
      // state (cycling), giving a "target"/bullseye look that is easy to
      // watch a rule erode, hold steady, or propagate outward from.
      if (clearFirst) engine.fillConstant(0);
      const maxRadius = 6;
      for (let radius = 0; radius <= maxRadius; radius++) {
        const state = cycleState(numStates, maxRadius - radius);
        for (const offset of hexRing(radius)) {
          setHex(engine, centerQ + offset.dq, centerR + offset.dr, state);
        }
      }
      return;
    }
    case "spiral": {
      // A true N-armed winding spiral needs the color to depend on an
      // "unwrapped" coordinate `radius + arms * bandWidth * angleFraction`
      // (not on ring-index alone, which only reproduces concentric rings
      // with no rotation from one ring to the next): going around a full
      // revolution at any fixed radius crosses exactly `arms` color-band
      // boundaries, and moving outward at fixed angle also crosses bands —
      // together these wind the arms outward exactly like a real spiral.
      if (clearFirst) engine.fillConstant(0);
      const maxRadius = 22;
      const arms = 3;
      const bandWidth = 3.2; // hexes per color band along a purely radial line
      setHex(engine, centerQ, centerR, cycleState(numStates, 0));
      for (let radius = 1; radius <= maxRadius; radius++) {
        for (const offset of hexRing(radius)) {
          const { x, y } = hexCenterXY(offset.dq, offset.dr);
          const angleFraction = (Math.atan2(y, x) / (2 * Math.PI) + 1) % 1; // 0..1
          const unwrapped = radius + arms * bandWidth * angleFraction;
          const state = cycleState(numStates, Math.floor(unwrapped / bandWidth));
          setHex(engine, centerQ + offset.dq, centerR + offset.dr, state);
        }
      }
      return;
    }
    case "twin-blooms": {
      // Two single-triangle seeds placed symmetrically about the center,
      // far enough apart to grow independently for a while before their
      // blooms meet in the middle — good for watching how a rule's fronts
      // interact/compete rather than just watching one bloom in isolation.
      if (clearFirst) engine.fillConstant(0);
      const offset = 10;
      engine.setCell(centerQ - offset, centerR, 0, highState);
      engine.setCell(centerQ + offset, centerR, 0, cycleState(numStates, 1));
      return;
    }
    case "checkerboard": {
      // A large, fully deterministic structured field (not noise, not a
      // single symmetric point) — useful for seeing how a rule responds to
      // regular input before throwing randomness at it. Diagonal period-k
      // stripes in axial coordinates read as a checkerboard/herringbone
      // weave once rendered through the triangle lattice.
      engine.fillConstant(0);
      const halfExtent = Math.min(48, Math.floor(Math.min(engine.width, engine.height) / 2) - 1);
      for (let dq = -halfExtent; dq <= halfExtent; dq++) {
        for (let dr = -halfExtent; dr <= halfExtent; dr++) {
          if (hexDistance(dq, dr) > halfExtent) continue;
          const state = cycleState(numStates, dq - dr);
          setHex(engine, centerQ + dq, centerR + dr, state);
        }
      }
      return;
    }
    case "random-island": {
      // "Random", but confined to a disk around the placement point on an
      // otherwise blank field — lets you watch an isolated random patch
      // grow, decay, or hold steady without the rest of the (otherwise
      // uniformly random) grid confounding the read.
      engine.fillConstant(0);
      const radius = 16;
      for (const offset of hexDisk(radius)) {
        if (Math.random() >= density) continue;
        const state = 1 + Math.floor(Math.random() * highState);
        setHex(engine, centerQ + offset.dq, centerR + offset.dr, state);
      }
      return;
    }
    default:
      throw new Error(`unknown seed pattern "${patternId}"`);
  }
}

/** Whether `patternId` can be stamped at a specific location (as opposed to always covering the whole grid). */
export function isPlaceablePattern(patternId) {
  return (
    patternId === "single" ||
    patternId === "center-hex" ||
    patternId === "six-ring" ||
    patternId === "rainbow-ring" ||
    patternId === "sector-wheel" ||
    patternId === "ring-target" ||
    patternId === "spiral" ||
    patternId === "twin-blooms" ||
    patternId === "random-island"
  );
}

/** Whether `patternId`'s density slider should be shown. */
export function isDensityAdjustablePattern(patternId) {
  return patternId === "random" || patternId === "random-island";
}
