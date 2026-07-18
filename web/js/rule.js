// Generalized k-state outer-totalistic rule on the Kisrhombille lattice —
// the same style of encoding Wolfram uses for totalistic cellular automata
// (e.g. 2-state 3-neighbor outer-totalistic rules number 0-255), generalized
// to any number of states *and* to either of 2 neighborhood sizes:
//
// - "edge" (3 neighbors): the classic neighborhood — each triangle's 3
//   edge-adjacent cells (see lattice.js's CROSS_HEX_NEIGHBOR).
// - "edge+vertex" (16 neighbors): the 3 edge-neighbors plus every other cell
//   sharing one of the triangle's 3 vertices (9 same-hex + 4 cross-hex —
//   see lattice.js's VERTEX_NEIGHBOR and geometry.py's `vertex_neighbors`,
//   the same conceptual step from a square grid's von-Neumann to Moore
//   neighborhood). A richer, slower-mixing neighborhood — the same rule
//   *number* under a different neighborhood is an unrelated rule, exactly
//   like the same rule number under a different `numStates` is (the table
//   layout depends on both).
//
// A rule is a lookup table `next = table[ownState * (maxSum + 1) + neighborSum]`,
// where `maxSum = numNeighbors * (k - 1)` is the largest possible sum of
// neighbor states. The table, read as a base-k numeral (least-significant
// entry first), is the rule's "code": `K{k}N{numNeighbors}R{decimal}` — the
// `N{numNeighbors}` segment is optional on *input* and defaults to 3 (every
// rule code saved before the extended neighborhood existed), but is always
// written explicitly by `encodeRule` so newly-generated codes are
// self-documenting and never ambiguous.

export const MIN_STATES = 2;
export const MAX_STATES = 9;
export const NUM_NEIGHBORS_OPTIONS = [3, 16];
export const DEFAULT_NUM_NEIGHBORS = 3;

// Fixed rule-lookup-texture capacity (no shader recompile on rule change).
// Must cover the worst case: tableSize(MAX_STATES, 16) = 9 * (16*8 + 1) = 1161;
// rounded up with headroom.
export const MAX_TABLE_SIZE = 2048;

export function validateNumNeighbors(numNeighbors) {
  if (!NUM_NEIGHBORS_OPTIONS.includes(numNeighbors)) {
    throw new Error(`numNeighbors must be one of ${NUM_NEIGHBORS_OPTIONS.join(", ")}, got ${numNeighbors}`);
  }
}

export function maxNeighborSum(numStates, numNeighbors = DEFAULT_NUM_NEIGHBORS) {
  return numNeighbors * (numStates - 1);
}

export function tableSize(numStates, numNeighbors = DEFAULT_NUM_NEIGHBORS) {
  return numStates * (maxNeighborSum(numStates, numNeighbors) + 1);
}

export function validateStateCount(numStates) {
  if (!Number.isInteger(numStates) || numStates < MIN_STATES || numStates > MAX_STATES) {
    throw new Error(`numStates must be an integer in [${MIN_STATES}, ${MAX_STATES}], got ${numStates}`);
  }
}

export function randomTable(numStates, numNeighbors = DEFAULT_NUM_NEIGHBORS, rng = Math.random) {
  validateStateCount(numStates);
  validateNumNeighbors(numNeighbors);
  const size = tableSize(numStates, numNeighbors);
  const table = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    table[i] = Math.floor(rng() * numStates);
  }
  return table;
}

/** `K{numStates}N{numNeighbors}R{decimal}` — the table read as a little-endian base-`numStates` numeral. */
export function encodeRule(numStates, table, numNeighbors = DEFAULT_NUM_NEIGHBORS) {
  validateStateCount(numStates);
  validateNumNeighbors(numNeighbors);
  const size = tableSize(numStates, numNeighbors);
  if (table.length !== size) {
    throw new Error(`table length ${table.length} does not match tableSize(${numStates}, ${numNeighbors}) = ${size}`);
  }
  let ruleNumber = 0n;
  const base = BigInt(numStates);
  for (let i = size - 1; i >= 0; i--) {
    const digit = table[i];
    if (digit < 0 || digit >= numStates) {
      throw new Error(`table[${i}] = ${digit} is out of range for ${numStates} states`);
    }
    ruleNumber = ruleNumber * base + BigInt(digit);
  }
  return `K${numStates}N${numNeighbors}R${ruleNumber.toString()}`;
}

// The `N{numNeighbors}` segment is optional on input (older codes predate
// the extended neighborhood and implicitly mean 3), but `encodeRule` always
// writes it — see module docstring.
const RULE_CODE_PATTERN = /^K(\d+)(?:N(\d+))?R(\d+)$/;

export function decodeRule(code) {
  const match = RULE_CODE_PATTERN.exec(code.trim());
  if (!match) {
    throw new Error(`"${code}" is not a valid rule code (expected format K<states>R<number> or K<states>N<neighbors>R<number>)`);
  }
  const numStates = Number(match[1]);
  const numNeighbors = match[2] === undefined ? DEFAULT_NUM_NEIGHBORS : Number(match[2]);
  validateStateCount(numStates);
  validateNumNeighbors(numNeighbors);
  let ruleNumber = BigInt(match[3]);
  const base = BigInt(numStates);
  const size = tableSize(numStates, numNeighbors);
  const table = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    table[i] = Number(ruleNumber % base);
    ruleNumber = ruleNumber / base;
  }
  if (ruleNumber !== 0n) {
    throw new Error(`"${code}" encodes a rule number too large for ${numStates} states / ${numNeighbors} neighbors (${size} table entries)`);
  }
  return { numStates, numNeighbors, table };
}

/**
 * `code` with its rule number shifted by `delta` (an integer, positive or
 * negative), clamped to `[0, numStates^tableSize - 1]` — lets the UI's
 * increment/decrement buttons "tick" through neighboring rules without the
 * state count or neighborhood ever changing. Note both travel with the code
 * by design: the same numeric part under a different `K` or `N` is an
 * unrelated rule (the table layout depends on both), not the "same rule at
 * a different resolution."
 */
export function shiftRuleNumber(code, delta) {
  const { numStates, numNeighbors, table } = decodeRule(code);
  const size = tableSize(numStates, numNeighbors);
  const base = BigInt(numStates);
  let ruleNumber = 0n;
  for (let i = size - 1; i >= 0; i--) {
    ruleNumber = ruleNumber * base + BigInt(table[i]);
  }
  const maxRuleNumber = base ** BigInt(size) - 1n;
  let shifted = ruleNumber + BigInt(delta);
  if (shifted < 0n) shifted = 0n;
  if (shifted > maxRuleNumber) shifted = maxRuleNumber;
  return `K${numStates}N${numNeighbors}R${shifted.toString()}`;
}

/**
 * The rule table is naturally block-structured by the cell's *own* current
 * state: `table[ownState * (maxSum + 1) + neighborSum]` means every entry
 * for `ownState = s` occupies one contiguous run of `maxSum + 1` entries —
 * "what happens to a cell currently in state `s`, as a function of its
 * neighbor sum," entirely independent of every other state's row. This is
 * what makes it possible to inspect, randomize, or step through just one
 * state's behavior while holding every other state's row fixed (e.g. to
 * design a rule where one color tends to clump — mostly `stasis`/`retreat`
 * transitions in its row — while another tends to spread — mostly
 * `advance` transitions in its row).
 */
export function rowBounds(numStates, numNeighbors, ownState) {
  const rowLength = maxNeighborSum(numStates, numNeighbors) + 1;
  return { start: ownState * rowLength, length: rowLength };
}

/** The `(maxSum + 1)`-entry slice of `table` governing transitions out of `ownState`. */
export function getRow(table, numStates, numNeighbors, ownState) {
  const { start, length } = rowBounds(numStates, numNeighbors, ownState);
  return table.slice(start, start + length);
}

/** `table` with `ownState`'s row replaced by `rowValues` (all other rows untouched); returns a new array. */
export function setRow(table, numStates, numNeighbors, ownState, rowValues) {
  const { start, length } = rowBounds(numStates, numNeighbors, ownState);
  if (rowValues.length !== length) {
    throw new Error(`row for state ${ownState} must have ${length} entries, got ${rowValues.length}`);
  }
  const next = table.slice();
  next.set(rowValues, start);
  return next;
}

/**
 * `table` with only the rows in `statesToRandomize` (a `Set`/array of own-state
 * indices) replaced by fresh random values — every other row (typically the
 * "pinned" ones) is copied through unchanged. This is the "randomize
 * unpinned colors only" operation: pin a color's row in the UI, and
 * Randomize only ever touches the rest.
 */
export function randomizeRows(table, numStates, numNeighbors, statesToRandomize, rng = Math.random) {
  const targets = new Set(statesToRandomize);
  const next = table.slice();
  for (const ownState of targets) {
    const { start, length } = rowBounds(numStates, numNeighbors, ownState);
    for (let i = 0; i < length; i++) {
      next[start + i] = Math.floor(rng() * numStates);
    }
  }
  return next;
}

/**
 * `table` with `ownState`'s row shifted by `delta`, treating just that row's
 * entries as their own little-endian base-`numStates` numeral (independent
 * of every other row) — the row-scoped analog of `shiftRuleNumber`, letting
 * the UI tick through variations of one color's behavior without touching
 * any other color's row. Clamped to that row's own valid range. Note this
 * is a "raw numeral" nudge, not a uniform one — because incrementing a
 * multi-digit numeral by 1 can carry (e.g. `...333 + 1 = ...000` in base 4),
 * a single `delta = 1` step usually changes only the row's first entry
 * (the `neighborSum = 0` transition), but occasionally cascades and changes
 * many entries at once. For a uniform, always-predictable "push this
 * color's whole behavior up or down" operation, see `cycleRow` instead.
 */
export function shiftRow(table, numStates, numNeighbors, ownState, delta) {
  const { start, length } = rowBounds(numStates, numNeighbors, ownState);
  const base = BigInt(numStates);
  let rowNumber = 0n;
  for (let i = length - 1; i >= 0; i--) {
    rowNumber = rowNumber * base + BigInt(table[start + i]);
  }
  const maxRowNumber = base ** BigInt(length) - 1n;
  let shifted = rowNumber + BigInt(delta);
  if (shifted < 0n) shifted = 0n;
  if (shifted > maxRowNumber) shifted = maxRowNumber;
  const next = table.slice();
  for (let i = 0; i < length; i++) {
    next[start + i] = Number(shifted % base);
    shifted /= base;
  }
  return next;
}

/**
 * `table` with every entry of `ownState`'s row advanced (`delta > 0`) or
 * retreated (`delta < 0`) by `|delta|` colors, cyclically (mod `numStates`)
 * — e.g. `delta = 1` turns every "stay the same" entry in this row into
 * "advance to the next color," every "advance" entry into "advance twice,"
 * and so on, uniformly across the whole row. This is the "push this
 * color's whole behavior up or down" operation: unlike `shiftRow` (which
 * nudges the row's *raw encoded number*, and can carry unpredictably), this
 * always changes every entry in the row by exactly the same amount, so its
 * effect on the row's stasis/advance/retreat mix (see `classifyRow`) is
 * exact and predictable — and since it is inherently cyclic with period
 * `numStates`, shifting by a multiple of `numStates` is a no-op by
 * construction, not a bug.
 */
export function cycleRow(table, numStates, numNeighbors, ownState, delta) {
  const { start, length } = rowBounds(numStates, numNeighbors, ownState);
  const shift = ((delta % numStates) + numStates) % numStates;
  const next = table.slice();
  for (let i = 0; i < length; i++) {
    next[start + i] = (next[start + i] + shift) % numStates;
  }
  return next;
}

/**
 * Classifies every entry of `ownState`'s row as `"stasis"` (next == own),
 * `"advance"` (next == own + 1 mod k), `"retreat"` (next == own - 1 mod k),
 * or `"other"` — the same breakdown `experiments/analyze_rule.py`'s
 * `classify_table` prints to the terminal, surfaced here for the browser's
 * advanced rule view. A row dominated by `stasis`/`retreat` tends to hold
 * its color in place ("clumpy"); one dominated by `advance` tends to cycle
 * through colors quickly, which usually reads visually as that color
 * spreading/moving rather than sitting still ("mobile").
 */
export function classifyRow(table, numStates, numNeighbors, ownState) {
  const row = getRow(table, numStates, numNeighbors, ownState);
  const counts = { stasis: 0, advance: 0, retreat: 0, other: 0 };
  const labels = [];
  for (const next of row) {
    if (next === ownState) {
      counts.stasis++;
      labels.push("stasis");
    } else if (next === (ownState + 1) % numStates) {
      counts.advance++;
      labels.push("advance");
    } else if (next === (ownState - 1 + numStates) % numStates) {
      counts.retreat++;
      labels.push("retreat");
    } else {
      counts.other++;
      labels.push("other");
    }
  }
  return { row, labels, counts };
}

/** The all-stasis table (every entry 0, i.e. rule number 0 — the "lowest config") for `numStates`/`numNeighbors`. Every cell stays state 0 forever; a good starting point for "increment slightly to find the critical point" exploration. */
export function zeroTable(numStates, numNeighbors = DEFAULT_NUM_NEIGHBORS) {
  return new Uint8Array(tableSize(numStates, numNeighbors));
}

/** `table` with `ownState`'s row reset to all-zero (independent of every other row) — the row-scoped analog of `zeroTable`. */
export function zeroRow(table, numStates, numNeighbors, ownState) {
  const { start, length } = rowBounds(numStates, numNeighbors, ownState);
  const next = table.slice();
  next.fill(0, start, start + length);
  return next;
}

/** `table`, zero-padded to `MAX_TABLE_SIZE`, as a `Float32Array` ready to upload to the rule lookup texture. */
export function tableToTextureData(table) {
  const data = new Float32Array(MAX_TABLE_SIZE);
  for (let i = 0; i < table.length; i++) {
    data[i] = table[i];
  }
  return data;
}
