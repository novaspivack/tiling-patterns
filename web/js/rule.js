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

/** `table`, zero-padded to `MAX_TABLE_SIZE`, as a `Float32Array` ready to upload to the rule lookup texture. */
export function tableToTextureData(table) {
  const data = new Float32Array(MAX_TABLE_SIZE);
  for (let i = 0; i < table.length; i++) {
    data[i] = table[i];
  }
  return data;
}
