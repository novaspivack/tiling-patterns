// Palette generation for up to MAX_STATES color classes, with several named
// palettes to choose from.

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

function huesweepPalette(hueStart, hueSpan, saturation, lightness) {
  return (numStates) => {
    const data = new Float32Array(MAX_STATES * 3);
    for (let i = 0; i < numStates; i++) {
      const t = numStates > 1 ? i / numStates : 0;
      const hue = (hueStart + t * hueSpan) % 360;
      const [r, g, b] = hslToRgb(hue, saturation, lightness);
      data[i * 3 + 0] = r;
      data[i * 3 + 1] = g;
      data[i * 3 + 2] = b;
    }
    return data;
  };
}

function grayscalePalette(numStates) {
  const data = new Float32Array(MAX_STATES * 3);
  for (let i = 0; i < numStates; i++) {
    const t = numStates > 1 ? i / (numStates - 1) : 0;
    const lightness = 0.12 + t * 0.78;
    data[i * 3 + 0] = lightness;
    data[i * 3 + 1] = lightness;
    data[i * 3 + 2] = lightness;
  }
  return data;
}

export const PALETTES = [
  { id: "rainbow", name: "Rainbow", generate: huesweepPalette(0, 360, 0.62, 0.58) },
  { id: "warm", name: "Warm (reds, golds, magenta)", generate: huesweepPalette(340, 90, 0.68, 0.55) },
  { id: "cool", name: "Cool (blues, teals, violets)", generate: huesweepPalette(170, 130, 0.6, 0.55) },
  { id: "sunset", name: "Sunset", generate: huesweepPalette(300, 100, 0.7, 0.6) },
  { id: "grayscale", name: "Grayscale", generate: grayscalePalette },
];

export const DEFAULT_PALETTE_ID = "rainbow";

export function generatePalette(paletteId, numStates) {
  const palette = PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0];
  return palette.generate(numStates);
}
