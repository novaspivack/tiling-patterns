// Lightweight live statistics: periodically reads back a modest subregion
// of the state texture (not the whole grid — `readPixels` stalls the GPU
// pipeline, so this is sampled a few times a second, not every generation)
// and tracks activity fraction, state entropy, and per-state counts over
// time for the stats panel's graph.

import { NUM_SECTORS } from "./lattice.js";

const SAMPLE_SIZE = 96;

export class StatsTracker {
  constructor(gl) {
    this.gl = gl;
    this.fbo = gl.createFramebuffer();
    this.history = [];
    this.maxHistory = 240;
    this._previousSample = null;
    this.latest = null;
  }

  reset() {
    this.history = [];
    this._previousSample = null;
    this.latest = null;
  }

  sample(engine) {
    const gl = this.gl;
    const size = Math.min(SAMPLE_SIZE, engine.width, engine.height);
    const layerSize = size * size;
    const current = new Uint8Array(layerSize * NUM_SECTORS);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    const buf = new Float32Array(layerSize * 4);
    for (let layer = 0; layer < NUM_SECTORS; layer++) {
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, engine.srcTexture, 0, layer);
      gl.readPixels(0, 0, size, size, gl.RGBA, gl.FLOAT, buf);
      const base = layer * layerSize;
      for (let i = 0; i < layerSize; i++) {
        current[base + i] = Math.round(buf[i * 4]);
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const counts = new Array(engine.numStates).fill(0);
    for (let i = 0; i < current.length; i++) {
      const state = Math.min(current[i], engine.numStates - 1);
      counts[state]++;
    }

    let changed = 0;
    if (this._previousSample && this._previousSample.length === current.length) {
      for (let i = 0; i < current.length; i++) {
        if (current[i] !== this._previousSample[i]) changed++;
      }
    }
    this._previousSample = current;

    const total = current.length;
    const activity = changed / total;
    let entropyBits = 0;
    for (const count of counts) {
      if (count > 0) {
        const p = count / total;
        entropyBits -= p * Math.log2(p);
      }
    }
    const maxEntropyBits = Math.log2(engine.numStates);
    const entropy = maxEntropyBits > 0 ? entropyBits / maxEntropyBits : 0;

    const entry = { generation: engine.generation, activity, entropy, counts, total };
    this.latest = entry;
    this.history.push(entry);
    if (this.history.length > this.maxHistory) this.history.shift();
    return entry;
  }
}

function drawSeries(ctx, values, width, height, color) {
  if (values.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  values.forEach((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - Math.max(0, Math.min(1, value)) * height;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

export function drawStatsGraph(canvas, history) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  if (history.length < 2) return;
  drawSeries(ctx, history.map((e) => e.activity), width, height, "#5fae78");
  drawSeries(ctx, history.map((e) => e.entropy), width, height, "#e0a44d");
}

export function formatStatsLabel(entry) {
  if (!entry) return "";
  const countsText = entry.counts.map((c, i) => `${i}:${((c / entry.total) * 100).toFixed(0)}%`).join(" ");
  return `gen ${entry.generation} — activity ${(entry.activity * 100).toFixed(1)}% (green) · entropy ${(entry.entropy * 100).toFixed(0)}% (gold) · ${countsText}`;
}
