// Plain-JS port of the domain-folding math in `geometry.py` / `render.js`'s
// GLSL, used on the CPU for paint hit-testing (mapping a clicked world point
// to the exact triangle under the cursor). Keep this in lockstep with
// `geometry.py` Section 1 and `render.js`'s fragment shader if either changes.

import { SQRT3, SECTOR_ANGLE, NUM_SECTORS } from "./lattice.js";

export function hexCenter(q, r, edgeLength) {
  return [edgeLength * (SQRT3 * q + (SQRT3 / 2) * r), edgeLength * 1.5 * r];
}

function roundAxial(qf, rf) {
  const xf = qf;
  const zf = rf;
  const yf = -xf - zf;
  let rx = Math.round(xf);
  let ry = Math.round(yf);
  let rz = Math.round(zf);
  const dx = Math.abs(rx - xf);
  const dy = Math.abs(ry - yf);
  const dz = Math.abs(rz - zf);
  if (dx > dy && dx > dz) {
    rx = -ry - rz;
  } else if (dy > dz) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }
  return [rx, rz];
}

export function nearestHex(worldX, worldY, edgeLength) {
  const qf = ((SQRT3 / 3) * worldX - worldY / 3) / edgeLength;
  const rf = ((2 / 3) * worldY) / edgeLength;
  return roundAxial(qf, rf);
}

/** `{ q, r, sector }` for the fundamental triangle containing `(worldX, worldY)`. */
export function foldToFundamental(worldX, worldY, edgeLength) {
  const [q, r] = nearestHex(worldX, worldY, edgeLength);
  const [cx, cy] = hexCenter(q, r, edgeLength);
  const px = worldX - cx;
  const py = worldY - cy;
  const theta = ((Math.atan2(py, px) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const rawSector = Math.floor(theta / SECTOR_ANGLE);
  const sector = ((rawSector % NUM_SECTORS) + NUM_SECTORS) % NUM_SECTORS;
  return { q, r, sector };
}
