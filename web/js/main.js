// App bootstrap: wires the CA engine, camera, and renderer together, runs
// the animation loop, and exposes the small interface controls.js drives.

import { SQRT3 } from "./lattice.js";
import { Engine } from "./engine.js";
import { Camera } from "./camera.js";
import { Renderer, EDGE_LENGTH } from "./render.js";
import { generatePalette, DEFAULT_PALETTE_ID } from "./palette.js";
import { decodeRule, DEFAULT_NUM_NEIGHBORS } from "./rule.js";
import { defaultPresetFor } from "./presets.js";
import { applySeedPattern, applySeedPatternAt, isPlaceablePattern, DEFAULT_SEED_PATTERN_ID, DEFAULT_DENSITY } from "./seed-patterns.js";
import { foldToFundamental } from "./fold.js";
import { StatsTracker } from "./stats.js";
import { wireControls } from "./controls.js";

const GRID_WIDTH = 512;
const GRID_HEIGHT = 512;
const DEFAULT_SPEED = 8; // generations/sec — the GPU engine is fast enough that this already looks lively
const DEFAULT_ZOOM_PERCENT = 75;
const MAX_STEPS_PER_FRAME = 30; // guards against a runaway catch-up burst after e.g. a backgrounded tab

class App {
  constructor() {
    this.canvas = document.getElementById("grid-canvas");
    const gl = this.canvas.getContext("webgl2", { antialias: false, alpha: false, preserveDrawingBuffer: true });
    if (!gl) {
      throw new Error("WebGL2 is not available in this browser.");
    }
    this.gl = gl;

    this.engine = new Engine(gl, GRID_WIDTH, GRID_HEIGHT);
    this.camera = new Camera(this.canvas);
    this.renderer = new Renderer(gl, this.canvas);
    this.stats = new StatsTracker(gl);
    this._lastStatsSampleTime = 0;
    this.onStatsUpdate = null;

    this.numStates = 2;
    this.numNeighbors = DEFAULT_NUM_NEIGHBORS;
    this.table = null;
    this.paletteId = DEFAULT_PALETTE_ID;
    this.paletteData = generatePalette(this.paletteId, 2);
    this.currentPresetCode = null;

    this.seedPatternId = DEFAULT_SEED_PATTERN_ID;
    this.density = DEFAULT_DENSITY;

    this.paintState = 1;
    this.hoverHex = null;

    this.running = true;
    this.speed = DEFAULT_SPEED;
    this._accumulatedSeconds = 0;
    this._lastFrameTime = null;

    this.onGenerationChange = null;
    this.onRuleChange = null;

    this.camera.onPaint = (worldX, worldY) => {
      const { q, r, sector } = foldToFundamental(worldX, worldY, EDGE_LENGTH);
      this.engine.setCell(q, r, sector, this.paintState);
    };
    this.camera.onPlace = (worldX, worldY) => {
      if (!isPlaceablePattern(this.seedPatternId)) return;
      const { q, r } = foldToFundamental(worldX, worldY, EDGE_LENGTH);
      applySeedPatternAt(this.engine, this.seedPatternId, q, r, { clearFirst: false });
    };
    this.camera.onHover = (worldX, worldY) => {
      const { q, r } = foldToFundamental(worldX, worldY, EDGE_LENGTH);
      this.hoverHex = { q, r };
    };

    window.addEventListener("resize", () => this._resizeCanvas());
    this._resizeCanvas();

    const worldWidth = GRID_WIDTH * EDGE_LENGTH * SQRT3;
    const worldHeight = GRID_HEIGHT * EDGE_LENGTH * 1.5;
    this.camera.setWorldExtent(worldWidth, worldHeight);

    const defaultPreset = defaultPresetFor(this.numNeighbors);
    const { numStates, numNeighbors, table } = decodeRule(defaultPreset.code);
    this.applyRule(numStates, table, numNeighbors, defaultPreset.code);
    this.resetView();
    this.reseed(); // texture storage contents are unspecified until explicitly written

    requestAnimationFrame((t) => this._frame(t));
  }

  _resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;
    this.canvas.width = Math.max(1, Math.round(displayWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(displayHeight * dpr));
  }

  /** `presetCode` is the matching entry in `presets.js` when this rule came from that dropdown, `null` otherwise (randomize, manual edit, increment/decrement) — drives whether the preset dropdown shows a selection. */
  applyRule(numStates, table, numNeighbors = DEFAULT_NUM_NEIGHBORS, presetCode = null) {
    this.numStates = numStates;
    this.numNeighbors = numNeighbors;
    this.table = table;
    this.paletteData = generatePalette(this.paletteId, numStates);
    this.engine.setRule(numStates, table, numNeighbors);
    this.currentPresetCode = presetCode;
    this.paintState = Math.min(this.paintState, numStates - 1);
    this.stats.reset();
    if (this.onRuleChange) this.onRuleChange();
  }

  /** Switches the active neighborhood (3 edge-only, or 16 edge+vertex) and applies that neighborhood's default preset — a rule number under the old neighborhood has a completely different table layout, so it cannot be carried over as-is. */
  setNeighborhoodMode(numNeighbors) {
    if (numNeighbors === this.numNeighbors) return;
    const preset = defaultPresetFor(numNeighbors);
    const { numStates, table } = decodeRule(preset.code);
    this.applyRule(numStates, table, numNeighbors, preset.code);
  }

  setPalette(paletteId) {
    this.paletteId = paletteId;
    this.paletteData = generatePalette(paletteId, this.numStates);
  }

  setSeedPattern(seedPatternId) {
    this.seedPatternId = seedPatternId;
  }

  setDensity(density) {
    this.density = density;
  }

  setInteractionMode(mode) {
    this.camera.mode = mode;
  }

  setPaintState(state) {
    this.paintState = state;
  }

  /** Places the selected pattern at the center of the *current view* (wherever the camera has panned to), not a fixed grid coordinate — so it is always visible without needing to pan to find it. */
  placeAtCenter() {
    if (!isPlaceablePattern(this.seedPatternId)) return;
    const { q, r } = foldToFundamental(this.camera.x, this.camera.y, EDGE_LENGTH);
    applySeedPatternAt(this.engine, this.seedPatternId, q, r, { clearFirst: false });
  }

  reseed() {
    applySeedPattern(this.engine, this.seedPatternId, { density: this.density });
    this.stats.reset();
    if (this.onGenerationChange) this.onGenerationChange(this.engine.generation);
  }

  stepOnce() {
    this.engine.step();
    if (this.onGenerationChange) this.onGenerationChange(this.engine.generation);
  }

  setRunning(running) {
    this.running = running;
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  resetView() {
    this.camera.setZoomPercent(DEFAULT_ZOOM_PERCENT);
    this.camera.x = 0;
    this.camera.y = 0;
  }

  saveScreenshot() {
    this.canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.href = url;
      link.download = `kisrhombille-ca-${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  _frame(timeMillis) {
    if (this._lastFrameTime === null) this._lastFrameTime = timeMillis;
    const dtSeconds = Math.min((timeMillis - this._lastFrameTime) / 1000, 0.25);
    this._lastFrameTime = timeMillis;

    if (this.running) {
      this._accumulatedSeconds += dtSeconds;
      const secondsPerStep = 1 / this.speed;
      let stepsThisFrame = 0;
      while (this._accumulatedSeconds >= secondsPerStep && stepsThisFrame < MAX_STEPS_PER_FRAME) {
        this.engine.step();
        this._accumulatedSeconds -= secondsPerStep;
        stepsThisFrame++;
      }
      if (stepsThisFrame > 0 && this.onGenerationChange) {
        this.onGenerationChange(this.engine.generation);
      }
    }

    const highlight = this.camera.mode === "place" && isPlaceablePattern(this.seedPatternId) ? this.hoverHex : null;
    this.renderer.draw(this.engine, this.camera, this.paletteData, highlight);

    if (timeMillis - this._lastStatsSampleTime > 500) {
      this._lastStatsSampleTime = timeMillis;
      const entry = this.stats.sample(this.engine);
      if (this.onStatsUpdate) this.onStatsUpdate(entry);
    }

    requestAnimationFrame((t) => this._frame(t));
  }
}

const app = new App();
window.app = app; // convenient for debugging from devtools
wireControls(app);
window.__appStarted = true; // tells index.html's startup-error banner that later runtime errors are not startup failures
