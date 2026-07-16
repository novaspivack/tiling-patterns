// Generalized k-state outer-totalistic rule on the Kisrhombille lattice's
// 3-neighbor adjacency graph — the same style of encoding Wolfram uses for
// totalistic cellular automata (e.g. 2-state 3-neighbor outer-totalistic
// rules number 0-255), generalized to any number of states.
//
// A rule is a lookup table `next = table[ownState * (maxSum + 1) + neighborSum]`,
// where `maxSum = 3 * (k - 1)` is the largest possible sum of 3 neighbor
// states. The table, read as a base-k numeral (least-significant entry
// first), is the rule's "code": `K{k}R{decimal}`.

export const MIN_STATES = 2;
export const MAX_STATES = 9; // tableSize(9) = 9*25 = 225 <= MAX_TABLE_SIZE
export const MAX_TABLE_SIZE = 256; // fixed rule-lookup-texture capacity (no shader recompile on rule change)

export function maxNeighborSum(numStates) {
  return 3 * (numStates - 1);
}

export function tableSize(numStates) {
  return numStates * (maxNeighborSum(numStates) + 1);
}

export function validateStateCount(numStates) {
  if (!Number.isInteger(numStates) || numStates < MIN_STATES || numStates > MAX_STATES) {
    throw new Error(`numStates must be an integer in [${MIN_STATES}, ${MAX_STATES}], got ${numStates}`);
  }
}

export function randomTable(numStates, rng = Math.random) {
  validateStateCount(numStates);
  const size = tableSize(numStates);
  const table = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    table[i] = Math.floor(rng() * numStates);
  }
  return table;
}

/** `K{numStates}R{decimal}` — the table read as a little-endian base-`numStates` numeral. */
export function encodeRule(numStates, table) {
  validateStateCount(numStates);
  const size = tableSize(numStates);
  if (table.length !== size) {
    throw new Error(`table length ${table.length} does not match tableSize(${numStates}) = ${size}`);
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
  return `K${numStates}R${ruleNumber.toString()}`;
}

const RULE_CODE_PATTERN = /^K(\d+)R(\d+)$/;

export function decodeRule(code) {
  const match = RULE_CODE_PATTERN.exec(code.trim());
  if (!match) {
    throw new Error(`"${code}" is not a valid rule code (expected format K<states>R<number>)`);
  }
  const numStates = Number(match[1]);
  validateStateCount(numStates);
  let ruleNumber = BigInt(match[2]);
  const base = BigInt(numStates);
  const size = tableSize(numStates);
  const table = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    table[i] = Number(ruleNumber % base);
    ruleNumber = ruleNumber / base;
  }
  if (ruleNumber !== 0n) {
    throw new Error(`"${code}" encodes a rule number too large for ${numStates} states (${size} table entries)`);
  }
  return { numStates, table };
}

/**
 * `code` with its rule number shifted by `delta` (an integer, positive or
 * negative), clamped to `[0, numStates^tableSize - 1]` — lets the UI's
 * increment/decrement buttons "tick" through neighboring rules without the
 * state count ever changing. Note the state count travels with the code by
 * design: the same numeric part under a different `K` is an unrelated rule
 * (the table layout depends on `numStates`), not the "same rule at a
 * different resolution."
 */
export function shiftRuleNumber(code, delta) {
  const { numStates, table } = decodeRule(code);
  const size = tableSize(numStates);
  const base = BigInt(numStates);
  let ruleNumber = 0n;
  for (let i = size - 1; i >= 0; i--) {
    ruleNumber = ruleNumber * base + BigInt(table[i]);
  }
  const maxRuleNumber = base ** BigInt(size) - 1n;
  let shifted = ruleNumber + BigInt(delta);
  if (shifted < 0n) shifted = 0n;
  if (shifted > maxRuleNumber) shifted = maxRuleNumber;
  return `K${numStates}R${shifted.toString()}`;
}

/** `table`, zero-padded to `MAX_TABLE_SIZE`, as a `Float32Array` ready to upload to the rule lookup texture. */
export function tableToTextureData(table) {
  const data = new Float32Array(MAX_TABLE_SIZE);
  for (let i = 0; i < table.length; i++) {
    data[i] = table[i];
  }
  return data;
}
