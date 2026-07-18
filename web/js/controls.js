// UI wiring: run/pause/step/reset, speed/zoom sliders, seed patterns +
// density, paint mode + swatches, preset dropdown, manual rule editor
// (randomize, encode + copy, paste + apply), palette dropdown, screenshot
// button, and panel show/hide. Pure DOM glue — no WebGL here.

import { MAX_STATES, MIN_STATES, NUM_NEIGHBORS_OPTIONS, classifyRow, decodeRule, encodeRule, randomTable, shiftRuleNumber, tableSize } from "./rule.js";
import { presetsFor } from "./presets.js";
import { PALETTES } from "./palette.js";
import { SEED_PATTERNS, isPlaceablePattern, isDensityAdjustablePattern } from "./seed-patterns.js";
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

  const neighborhoodButtons = new Map(NUM_NEIGHBORS_OPTIONS.map((n) => [n, document.getElementById(`neighborhood-${n}-button`)]));

  const presetSelect = document.getElementById("preset-select");
  const statesInput = document.getElementById("states-input");
  const randomizeButton = document.getElementById("randomize-button");
  const ruleCodeField = document.getElementById("rule-code-field");
  const ruleIncrementButton = document.getElementById("rule-increment-button");
  const ruleDecrementButton = document.getElementById("rule-decrement-button");
  const copyCodeButton = document.getElementById("copy-code-button");
  const applyCodeButton = document.getElementById("apply-code-button");
  const resetRuleButton = document.getElementById("reset-rule-button");
  const ruleStatusLabel = document.getElementById("rule-status-label");

  const advancedViewToggle = document.getElementById("advanced-view-toggle");
  const advancedRuleRows = document.getElementById("advanced-rule-rows");
  const advancedRuleActions = document.getElementById("advanced-rule-actions");
  const advancedRuleActions2 = document.getElementById("advanced-rule-actions-2");
  const advancedRuleCodeField = document.getElementById("advanced-rule-code-field");
  const advancedCopyCodeButton = document.getElementById("advanced-copy-code-button");
  const randomizeUnpinnedButton = document.getElementById("randomize-unpinned-button");
  const advancedResetGridButton = document.getElementById("advanced-reset-grid-button");
  let advancedViewVisible = false;

  const paletteSelect = document.getElementById("palette-select");
  const screenshotButton = document.getElementById("screenshot-button");

  const statsCanvas = document.getElementById("stats-canvas");
  const statsLabel = document.getElementById("stats-label");

  function rebuildPresetOptions() {
    presetSelect.innerHTML = "";
    for (const preset of presetsFor(app.numNeighbors)) {
      const option = document.createElement("option");
      option.value = preset.code;
      option.textContent = preset.name;
      option.title = preset.description;
      presetSelect.appendChild(option);
    }
  }
  rebuildPresetOptions();

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
    ruleCodeField.value = encodeRule(app.numStates, app.table, app.numNeighbors);
  }

  function refreshAdvancedRuleCodeField() {
    if (!advancedViewVisible) return;
    advancedRuleCodeField.value = encodeRule(app.numStates, app.table, app.numNeighbors);
  }

  function setNeighborhoodModeUI(numNeighbors) {
    app.setNeighborhoodMode(numNeighbors);
    for (const [n, button] of neighborhoodButtons) {
      button.classList.toggle("active", n === numNeighbors);
    }
    rebuildPresetOptions();
    presetSelect.value = app.currentPresetCode ?? "";
    statesInput.value = String(app.numStates);
    refreshRuleCodeField();
    rebuildPaintSwatches();
    setRuleStatus(`Switched to ${numNeighbors}-neighbor mode; applied its default preset.`);
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

  // One entry per state, reused across updates so a row's own buttons are
  // never destroyed while the user might be actively pressing/holding one
  // of them — only `ensureAdvancedRuleRowElements` (row *count* changed)
  // tears down and recreates DOM nodes; every other rule change just
  // updates existing nodes' colors/widths/titles in place. Recreating a
  // held button's DOM node mid-press is exactly what caused an earlier bug
  // where a row's press-and-hold acceleration never stopped: the button
  // got detached from the document before its `pointerup` could ever
  // reach it, so the accelerating repeat interval ran forever.
  let advancedRuleRowRefs = [];

  function ensureAdvancedRuleRowElements(numStates) {
    if (advancedRuleRowRefs.length === numStates) return;
    advancedRuleRows.innerHTML = "";
    advancedRuleRowRefs = [];
    for (let state = 0; state < numStates; state++) {
      const rowEl = document.createElement("div");
      rowEl.className = "advanced-rule-row";

      const swatch = document.createElement("span");
      swatch.className = "swatch";
      rowEl.appendChild(swatch);

      const pinButton = document.createElement("button");
      pinButton.className = "pin-button";
      pinButton.addEventListener("click", () => {
        app.togglePinnedState(state);
        updateAdvancedRuleRowContents();
      });
      rowEl.appendChild(pinButton);

      const resetButton = document.createElement("button");
      resetButton.className = "row-step-button";
      resetButton.title = `Reset color ${state}'s row to 0 (all-stasis)`;
      resetButton.textContent = "0";
      resetButton.addEventListener("click", () => app.resetStateRowToZero(state));
      rowEl.appendChild(resetButton);

      const decButton = document.createElement("button");
      decButton.className = "row-step-button";
      decButton.title = `Push color ${state}'s whole row down one color (cyclic; hold to repeat)`;
      decButton.textContent = "▼";
      wireHoldToAccelerate(decButton, -1, (delta) => app.cycleStateRow(state, delta));
      rowEl.appendChild(decButton);

      const incButton = document.createElement("button");
      incButton.className = "row-step-button";
      incButton.title = `Push color ${state}'s whole row up one color (cyclic; hold to repeat)`;
      incButton.textContent = "▲";
      wireHoldToAccelerate(incButton, 1, (delta) => app.cycleStateRow(state, delta));
      rowEl.appendChild(incButton);

      const bar = document.createElement("div");
      bar.className = "row-bar";
      rowEl.appendChild(bar);

      advancedRuleRows.appendChild(rowEl);
      advancedRuleRowRefs.push({ swatch, pinButton, bar });
    }
  }

  function updateAdvancedRuleRowContents() {
    const palette = app.paletteData;
    for (let state = 0; state < advancedRuleRowRefs.length; state++) {
      const { swatch, pinButton, bar } = advancedRuleRowRefs[state];
      const { counts } = classifyRow(app.table, app.numStates, app.numNeighbors, state);
      const total = counts.stasis + counts.advance + counts.retreat + counts.other;
      const isPinned = app.pinnedStates.has(state);

      swatch.style.background = rgbToCss(palette[state * 3], palette[state * 3 + 1], palette[state * 3 + 2]);
      swatch.textContent = String(state);

      pinButton.className = `pin-button${isPinned ? " pinned" : ""}`;
      pinButton.title = isPinned
        ? `Color ${state} is pinned (its row is frozen) — click to unpin`
        : `Color ${state} is not pinned — click to pin (freeze its row)`;
      pinButton.textContent = isPinned ? "Pinned" : "Pin";

      // The bar's own segment <div>s are never interactive (no listeners,
      // no press-and-hold state), so rebuilding them on every update is
      // safe — only the row's buttons need identity to survive a rebuild.
      bar.innerHTML = "";
      for (const key of ["stasis", "advance", "retreat", "other"]) {
        if (counts[key] === 0) continue;
        const segment = document.createElement("div");
        segment.className = `row-bar-segment ${key}`;
        segment.style.width = `${(100 * counts[key]) / total}%`;
        segment.title = `${key}: ${counts[key]}/${total}`;
        bar.appendChild(segment);
      }
    }
  }

  function rebuildAdvancedRuleView() {
    if (!advancedViewVisible) return;
    ensureAdvancedRuleRowElements(app.numStates);
    updateAdvancedRuleRowContents();
  }

  function updateDensityVisibility() {
    densityRow.style.display = isDensityAdjustablePattern(seedPatternSelect.value) ? "flex" : "none";
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

  for (const [n, button] of neighborhoodButtons) {
    button.addEventListener("click", () => setNeighborhoodModeUI(n));
  }

  presetSelect.addEventListener("change", () => {
    const preset = presetsFor(app.numNeighbors).find((p) => p.code === presetSelect.value);
    if (!preset) return;
    try {
      const { numStates, numNeighbors, table } = decodeRule(preset.code);
      app.applyRule(numStates, table, numNeighbors, preset.code);
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
      const table = randomTable(numStates, app.numNeighbors, Math.random);
      app.applyRule(numStates, table, app.numNeighbors);
      presetSelect.value = "";
      refreshRuleCodeField();
      rebuildPaintSwatches();
      setRuleStatus(`Random ${numStates}-state, ${app.numNeighbors}-neighbor rule (${tableSize(numStates, app.numNeighbors)}-entry table) applied.`);
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
      const { numStates, numNeighbors, table } = decodeRule(ruleCodeField.value);
      app.applyRule(numStates, table, numNeighbors);
      statesInput.value = String(numStates);
      for (const [n, button] of neighborhoodButtons) button.classList.toggle("active", n === numNeighbors);
      rebuildPresetOptions();
      presetSelect.value = "";
      rebuildPaintSwatches();
      setRuleStatus(`Applied rule code (${numStates} states, ${numNeighbors} neighbors).`);
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
      const shifted = shiftRuleNumber(encodeRule(app.numStates, app.table, app.numNeighbors), delta);
      const { numStates, numNeighbors, table } = decodeRule(shifted);
      app.applyRule(numStates, table, numNeighbors);
      presetSelect.value = "";
      refreshRuleCodeField();
      rebuildPaintSwatches();
      setRuleStatus(`Rule number ${delta > 0 ? "incremented" : "decremented"} by ${Math.abs(delta)}.`);
    } catch (error) {
      setRuleStatus(error.message, true);
    }
  }
  // Press-and-hold accelerates: a quick tap steps by 1, but holding ramps
  // the step size up the longer the button stays held (1 -> 10 -> 100 ->
  // 1,000 -> 10,000 -> 100,000 -> 1,000,000 -> 10,000,000), so exploring
  // rule space by large jumps doesn't require thousands of individual
  // clicks. `shiftRuleNumber`/`shiftRow` (rule.js) already clamp at their
  // own maximum, so a step this large is harmless on a small table/row (it
  // just saturates at 0 or the max) — "large enough" rules/rows are simply
  // the ones where a big jump is *visibly* useful rather than clamping
  // away. Reused for both the global rule number and each advanced-view
  // row's own number — `applyStep(signedStep)` is whatever "shift by this
  // signed amount" means in that context.
  function wireHoldToAccelerate(button, direction, applyStep) {
    let holdTimeoutId = null;
    let repeatIntervalId = null;
    let holdStartTime = null;

    function stepSizeForElapsed(elapsedMs) {
      if (elapsedMs > 24000) return 10000000;
      if (elapsedMs > 20000) return 1000000;
      if (elapsedMs > 16000) return 100000;
      if (elapsedMs > 8000) return 10000;
      if (elapsedMs > 4000) return 1000;
      if (elapsedMs > 2000) return 100;
      if (elapsedMs > 800) return 10;
      return 1;
    }

    function stopHold() {
      if (holdTimeoutId !== null) {
        clearTimeout(holdTimeoutId);
        holdTimeoutId = null;
      }
      if (repeatIntervalId !== null) {
        clearInterval(repeatIntervalId);
        repeatIntervalId = null;
      }
      holdStartTime = null;
    }

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      applyStep(direction);
      holdStartTime = performance.now();
      holdTimeoutId = setTimeout(() => {
        repeatIntervalId = setInterval(() => {
          applyStep(direction * stepSizeForElapsed(performance.now() - holdStartTime));
        }, 120);
      }, 400);
    });
    button.addEventListener("pointerup", stopHold);
    button.addEventListener("pointerleave", stopHold);
    button.addEventListener("pointercancel", stopHold);
  }
  wireHoldToAccelerate(ruleIncrementButton, 1, shiftRule);
  wireHoldToAccelerate(ruleDecrementButton, -1, shiftRule);

  statesInput.addEventListener("change", () => {
    const value = Number(statesInput.value);
    if (!Number.isInteger(value) || value < MIN_STATES || value > MAX_STATES) {
      statesInput.value = String(app.numStates);
      setRuleStatus(`States must be an integer in [${MIN_STATES}, ${MAX_STATES}].`, true);
      return;
    }
    if (value === app.numStates) return;
    // A different state count means a completely different table size —
    // there is no existing table to "carry over" — so this applies a fresh
    // rule immediately, rather than leaving the advanced view/rule code
    // showing the *previous* state count's rule until Randomize is
    // clicked. A *random* table (not all-zero/all-stasis) matters here:
    // an all-stasis table makes every cell collapse to state 0 within a
    // single running generation regardless of what the grid currently
    // shows, which looked like "changing states makes the grid go solid"
    // — reseeding alone would not have fixed that, since the very next
    // frame would collapse it again.
    const table = randomTable(value, app.numNeighbors, Math.random);
    app.applyRule(value, table, app.numNeighbors);
    app.reseed();
    presetSelect.value = "";
    setRuleStatus(`Switched to ${value} states with a fresh random rule and seed.`);
  });

  paletteSelect.addEventListener("change", () => {
    app.setPalette(paletteSelect.value);
    rebuildPaintSwatches();
  });

  advancedViewToggle.addEventListener("click", () => {
    advancedViewVisible = !advancedViewVisible;
    advancedViewToggle.textContent = advancedViewVisible ? "Hide" : "Show";
    advancedRuleRows.hidden = !advancedViewVisible;
    advancedRuleActions.hidden = !advancedViewVisible;
    advancedRuleActions2.hidden = !advancedViewVisible;
    refreshAdvancedRuleCodeField();
    rebuildAdvancedRuleView();
  });

  randomizeUnpinnedButton.addEventListener("click", () => {
    if (app.pinnedStates.size >= app.numStates) {
      setRuleStatus("Every color is pinned — nothing left to randomize.", true);
      return;
    }
    app.randomizeUnpinnedRows();
    // Also reseeds: whatever the grid currently shows may already have
    // drained toward a state the *previous* rule favored (e.g. if a pinned
    // row happens to be all-stasis, that state is an absorbing sink and the
    // grid trends toward all-solid over time regardless of what the other
    // rows do) — a fresh seed guarantees this randomize actually looks
    // "randomized" rather than showing a stale, already-settled grid.
    app.reseed();
    presetSelect.value = "";
    setRuleStatus(`Randomized ${app.numStates - app.pinnedStates.size} unpinned color(s) and reseeded; kept ${app.pinnedStates.size} pinned color(s) unchanged.`);
  });

  // Convenience duplicate of the top toolbar's Reset button, so a fresh seed
  // is one click away while iterating on rule rows without scrolling back up.
  advancedResetGridButton.addEventListener("click", () => app.reseed());

  advancedCopyCodeButton.addEventListener("click", async () => {
    refreshAdvancedRuleCodeField();
    try {
      await navigator.clipboard.writeText(advancedRuleCodeField.value);
      setRuleStatus("Rule code copied to clipboard.");
    } catch {
      advancedRuleCodeField.select();
      setRuleStatus("Clipboard unavailable — code is selected, copy manually with Ctrl/Cmd+C.", true);
    }
  });

  resetRuleButton.addEventListener("click", () => {
    app.resetRuleToZero();
    presetSelect.value = "";
    setRuleStatus("Rule reset to 0 (all-stasis, the lowest config).");
  });

  screenshotButton.addEventListener("click", () => app.saveScreenshot());

  app.onGenerationChange = (generation) => {
    generationLabel.textContent = `gen ${generation}`;
  };
  app.onRuleChange = () => {
    statesInput.value = String(app.numStates);
    refreshRuleCodeField();
    refreshAdvancedRuleCodeField();
    rebuildPaintSwatches();
    rebuildAdvancedRuleView();
  };
  app.onStatsUpdate = (entry) => {
    drawStatsGraph(statsCanvas, app.stats.history);
    statsLabel.textContent = formatStatsLabel(entry);
  };

  // Initial UI state.
  for (const [n, button] of neighborhoodButtons) button.classList.toggle("active", n === app.numNeighbors);
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
  refreshAdvancedRuleCodeField();
  rebuildAdvancedRuleView();
  setInteractionModeUI("pan");
}
