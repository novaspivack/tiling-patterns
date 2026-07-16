// UI wiring: run/pause/step/reset, speed/zoom sliders, seed patterns +
// density, paint mode + swatches, preset dropdown, manual rule editor
// (randomize, encode + copy, paste + apply), palette dropdown, screenshot
// button, and panel show/hide. Pure DOM glue — no WebGL here.

import { MAX_STATES, MIN_STATES, decodeRule, encodeRule, randomTable, shiftRuleNumber, tableSize } from "./rule.js";
import { PRESETS } from "./presets.js";
import { PALETTES } from "./palette.js";
import { SEED_PATTERNS, isPlaceablePattern } from "./seed-patterns.js";
import { drawStatsGraph, formatStatsLabel } from "./stats.js";

export function wireControls(app) {
  const panel = document.getElementById("panel");
  const panelOpenButton = document.getElementById("panel-open-button");
  const panelCloseButton = document.getElementById("panel-close-button");

  const runButton = document.getElementById("run-button");
  const pauseButton = document.getElementById("pause-button");
  const stepButton = document.getElementById("step-button");
  const resetButton = document.getElementById("reset-button");
  const speedSlider = document.getElementById("speed-slider");
  const speedLabel = document.getElementById("speed-label");
  const zoomSlider = document.getElementById("zoom-slider");
  const zoomLabel = document.getElementById("zoom-label");
  const zoomResetButton = document.getElementById("zoom-reset-button");
  const generationLabel = document.getElementById("generation-label");

  const seedPatternSelect = document.getElementById("seed-pattern-select");
  const densityRow = document.querySelector(".density-row");
  const densitySlider = document.getElementById("density-slider");
  const densityLabel = document.getElementById("density-label");
  const placeCenterRow = document.getElementById("place-center-row");
  const placeCenterButton = document.getElementById("place-center-button");

  const modePanButton = document.getElementById("mode-pan-button");
  const modePaintButton = document.getElementById("mode-paint-button");
  const modePlaceButton = document.getElementById("mode-place-button");
  const paintSwatchesContainer = document.getElementById("paint-swatches");

  const presetSelect = document.getElementById("preset-select");
  const statesInput = document.getElementById("states-input");
  const randomizeButton = document.getElementById("randomize-button");
  const ruleCodeField = document.getElementById("rule-code-field");
  const ruleIncrementButton = document.getElementById("rule-increment-button");
  const ruleDecrementButton = document.getElementById("rule-decrement-button");
  const copyCodeButton = document.getElementById("copy-code-button");
  const applyCodeButton = document.getElementById("apply-code-button");
  const ruleStatusLabel = document.getElementById("rule-status-label");

  const paletteSelect = document.getElementById("palette-select");
  const screenshotButton = document.getElementById("screenshot-button");

  const statsCanvas = document.getElementById("stats-canvas");
  const statsLabel = document.getElementById("stats-label");

  for (const preset of PRESETS) {
    const option = document.createElement("option");
    option.value = preset.code;
    option.textContent = preset.name;
    option.title = preset.description;
    presetSelect.appendChild(option);
  }

  for (const pattern of SEED_PATTERNS) {
    const option = document.createElement("option");
    option.value = pattern.id;
    option.textContent = pattern.name;
    seedPatternSelect.appendChild(option);
  }

  for (const palette of PALETTES) {
    const option = document.createElement("option");
    option.value = palette.id;
    option.textContent = palette.name;
    paletteSelect.appendChild(option);
  }

  function setRuleStatus(message, isError = false) {
    ruleStatusLabel.textContent = message;
    ruleStatusLabel.classList.toggle("error", isError);
  }

  function refreshRuleCodeField() {
    ruleCodeField.value = encodeRule(app.numStates, app.table);
  }

  function rgbToCss(r, g, b) {
    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
  }

  function rebuildPaintSwatches() {
    paintSwatchesContainer.innerHTML = "";
    const palette = app.paletteData;
    for (let state = 0; state < app.numStates; state++) {
      const swatch = document.createElement("button");
      swatch.className = "swatch";
      swatch.style.background = rgbToCss(palette[state * 3], palette[state * 3 + 1], palette[state * 3 + 2]);
      swatch.title = `Paint state ${state}`;
      swatch.textContent = String(state);
      swatch.classList.toggle("selected", state === app.paintState);
      swatch.addEventListener("click", () => {
        app.setPaintState(state);
        rebuildPaintSwatches();
      });
      paintSwatchesContainer.appendChild(swatch);
    }
  }

  function updateDensityVisibility() {
    densityRow.style.display = seedPatternSelect.value === "random" ? "flex" : "none";
    placeCenterRow.style.display = isPlaceablePattern(seedPatternSelect.value) ? "flex" : "none";
  }

  function setInteractionModeUI(mode) {
    app.setInteractionMode(mode);
    modePanButton.classList.toggle("active", mode === "pan");
    modePaintButton.classList.toggle("active", mode === "paint");
    modePlaceButton.classList.toggle("active", mode === "place");
    paintSwatchesContainer.style.display = mode === "paint" ? "flex" : "none";
  }

  panelOpenButton.addEventListener("click", () => {
    panel.classList.remove("hidden");
    panelOpenButton.classList.add("hidden");
  });
  panelCloseButton.addEventListener("click", () => {
    panel.classList.add("hidden");
    panelOpenButton.classList.remove("hidden");
  });

  runButton.addEventListener("click", () => app.setRunning(true));
  pauseButton.addEventListener("click", () => app.setRunning(false));
  stepButton.addEventListener("click", () => {
    app.setRunning(false);
    app.stepOnce();
  });
  resetButton.addEventListener("click", () => app.reseed());

  speedSlider.addEventListener("input", () => {
    const speed = Number(speedSlider.value);
    app.setSpeed(speed);
    speedLabel.textContent = `${speed} gen/s`;
  });

  zoomSlider.addEventListener("input", () => {
    const percent = Number(zoomSlider.value);
    app.camera.setZoomPercent(percent);
    zoomLabel.textContent = `${percent}%`;
  });

  zoomResetButton.addEventListener("click", () => {
    app.resetView();
    zoomSlider.value = String(app.camera.getZoomPercent());
    zoomLabel.textContent = `${zoomSlider.value}%`;
  });

  seedPatternSelect.addEventListener("change", () => {
    app.setSeedPattern(seedPatternSelect.value);
    updateDensityVisibility();
    app.reseed(); // show the newly selected pattern immediately, not only after the next Reset click
  });

  densitySlider.addEventListener("input", () => {
    const density = Number(densitySlider.value);
    app.setDensity(density);
    densityLabel.textContent = density.toFixed(2);
  });

  placeCenterButton.addEventListener("click", () => app.placeAtCenter());

  modePanButton.addEventListener("click", () => setInteractionModeUI("pan"));
  modePaintButton.addEventListener("click", () => setInteractionModeUI("paint"));
  modePlaceButton.addEventListener("click", () => setInteractionModeUI("place"));

  presetSelect.addEventListener("change", () => {
    const preset = PRESETS.find((p) => p.code === presetSelect.value);
    if (!preset) return;
    try {
      const { numStates, table } = decodeRule(preset.code);
      app.applyRule(numStates, table, preset.code);
      statesInput.value = String(numStates);
      refreshRuleCodeField();
      rebuildPaintSwatches();
      setRuleStatus(`Applied preset "${preset.name}".`);
    } catch (error) {
      setRuleStatus(error.message, true);
    }
  });

  randomizeButton.addEventListener("click", () => {
    const numStates = Number(statesInput.value);
    try {
      const table = randomTable(numStates, Math.random);
      app.applyRule(numStates, table);
      presetSelect.value = "";
      refreshRuleCodeField();
      rebuildPaintSwatches();
      setRuleStatus(`Random ${numStates}-state rule (${tableSize(numStates)}-entry table) applied.`);
    } catch (error) {
      setRuleStatus(error.message, true);
    }
  });

  copyCodeButton.addEventListener("click", async () => {
    refreshRuleCodeField();
    try {
      await navigator.clipboard.writeText(ruleCodeField.value);
      setRuleStatus("Rule code copied to clipboard.");
    } catch {
      ruleCodeField.select();
      setRuleStatus("Clipboard unavailable — code is selected, copy manually with Ctrl/Cmd+C.", true);
    }
  });

  function applyTypedCode() {
    try {
      const { numStates, table } = decodeRule(ruleCodeField.value);
      app.applyRule(numStates, table);
      statesInput.value = String(numStates);
      presetSelect.value = "";
      rebuildPaintSwatches();
      setRuleStatus(`Applied rule code (${numStates} states).`);
    } catch (error) {
      setRuleStatus(error.message, true);
    }
  }

  applyCodeButton.addEventListener("click", applyTypedCode);
  ruleCodeField.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyTypedCode();
    }
  });

  function shiftRule(delta) {
    try {
      const shifted = shiftRuleNumber(encodeRule(app.numStates, app.table), delta);
      const { numStates, table } = decodeRule(shifted);
      app.applyRule(numStates, table);
      presetSelect.value = "";
      refreshRuleCodeField();
      rebuildPaintSwatches();
      setRuleStatus(`Rule number ${delta > 0 ? "incremented" : "decremented"}.`);
    } catch (error) {
      setRuleStatus(error.message, true);
    }
  }
  ruleIncrementButton.addEventListener("click", () => shiftRule(1));
  ruleDecrementButton.addEventListener("click", () => shiftRule(-1));

  statesInput.addEventListener("change", () => {
    const value = Number(statesInput.value);
    if (!Number.isInteger(value) || value < MIN_STATES || value > MAX_STATES) {
      statesInput.value = String(app.numStates);
      setRuleStatus(`States must be an integer in [${MIN_STATES}, ${MAX_STATES}].`, true);
    }
  });

  paletteSelect.addEventListener("change", () => {
    app.setPalette(paletteSelect.value);
    rebuildPaintSwatches();
  });

  screenshotButton.addEventListener("click", () => app.saveScreenshot());

  app.onGenerationChange = (generation) => {
    generationLabel.textContent = `gen ${generation}`;
  };
  app.onRuleChange = () => {
    statesInput.value = String(app.numStates);
    refreshRuleCodeField();
    rebuildPaintSwatches();
  };
  app.onStatsUpdate = (entry) => {
    drawStatsGraph(statsCanvas, app.stats.history);
    statsLabel.textContent = formatStatsLabel(entry);
  };

  // Initial UI state.
  presetSelect.value = app.currentPresetCode ?? "";
  statesInput.value = String(app.numStates);
  refreshRuleCodeField();
  speedSlider.value = String(app.speed);
  speedLabel.textContent = `${app.speed} gen/s`;
  zoomSlider.value = String(app.camera.getZoomPercent());
  zoomLabel.textContent = `${Math.round(app.camera.getZoomPercent())}%`;
  seedPatternSelect.value = app.seedPatternId;
  densitySlider.value = String(app.density);
  densityLabel.textContent = app.density.toFixed(2);
  updateDensityVisibility();
  paletteSelect.value = app.paletteId;
  rebuildPaintSwatches();
  setInteractionModeUI("pan");
}
