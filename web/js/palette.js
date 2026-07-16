// Palette generation for up to MAX_STATES color classes.

import { MAX_STATES } from "./rule.js";

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [r + m, g + m, b + m];
}

/** A `Float32Array` of `MAX_STATES` RGB triples (27 floats); only the first
 * `numStates` are used by the shader, but the array is always full-size so
 * it can be uploaded straight into the `uPalette[MAX_STATES]` uniform. */
export function generatePalette(numStates) {
  const data = new Float32Array(MAX_STATES * 3);
  for (let i = 0; i < numStates; i++) {
    const hue = (i * 360) / numStates;
    const [r, g, b] = hslToRgb(hue, 0.62, 0.58);
    data[i * 3 + 0] = r;
    data[i * 3 + 1] = g;
    data[i * 3 + 2] = b;
  }
  return data;
}
