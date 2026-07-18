// Curated "goldilocks" rules — see experiments/goldilocks_rule_search.py,
// experiments/explore_rule_neighborhood.py, and experiments/analyze_rule.py
// for the search/analysis methodology. Ordering is by observed quality
// (measured settled-activity plus visual character), best first, per
// feedback from watching each rule run for hundreds of generations —
// not just whether it initially looks promising.
//
// Kept as 2 separate lists, one per neighborhood size (see rule.js) — a
// rule code's table layout depends on the neighborhood it was found under,
// so a 3-neighbor rule number reinterpreted as a 16-neighbor rule (or vice
// versa) is not "the same rule at a different resolution," it is simply a
// different, unrelated rule (almost always an invalid/out-of-range one).

export const PRESETS_3 = [
  {
    name: "Living Bloom Field (default)",
    code: "K3R8045469900",
    description:
      "3-state; reaches a dynamic equilibrium rather than freezing — activity and color diversity settle to a stable, nonzero plateau (~20-25% of cells changing per generation forever), so small rosette blooms keep gently drifting on a calm background instead of the pattern going static. 63% of its single-entry rule-table mutations land in this same class — a broad, robust 'goldilocks basin,' not a fragile isolated point.",
  },
  {
    name: "Living Bloom Field (denser variant)",
    code: "K3R8090110944",
    description: "3-state; a 2-entry mutation of the default rule with denser, more numerous blooms, same living-equilibrium character.",
  },
  {
    name: "Traveling Blooms",
    code: "K3R8045469901",
    description:
      "3-state; a single-entry mutation of the default rule with a much higher, more textured settled activity (~35% of cells changing per generation, vs. ~20-25% for the calmer default) — structures visibly form and drift/relocate across the grid rather than staying put, giving a more turbulent, 'deposited and moving' feel.",
  },
  {
    name: "Drifting Embers",
    code: "K3R98944156",
    description:
      "3-state; decays slowly from an initial random seed and settles into a mostly-calm field with a very low, steady flicker of isolated active cells (~3% of cells changing per generation) — good if you want something closer to still, but not quite frozen.",
  },
  {
    name: "Roiling Mosaic",
    code: "K3R6173189343",
    description: "3-state; the most turbulent of the curated rules — settles to ~59% of cells changing per generation with near-maximal color diversity (94% of max entropy), a dense all-over churn rather than distinct blooms on a calm background.",
  },
  {
    name: "Churning Field",
    code: "K3R458382933",
    description: "3-state; high, steady settled activity (~56% of cells changing per generation) with high color diversity (84% of max entropy) — a busy, all-over churn similar in character to Roiling Mosaic but slightly calmer.",
  },
  {
    name: "Restless Bloom",
    code: "K3R8047614059",
    description: "3-state; settled activity (~36% of cells changing per generation) close to Traveling Blooms, with somewhat lower color diversity (75% of max entropy) — structures keep reforming rather than settling.",
  },
  {
    name: "Pulsing Rosettes",
    code: "K3R7782723867",
    description: "3-state; moderate settled activity (~26% of cells changing per generation) with the highest activity *variance* of the curated rules — visibly pulses between calmer and busier stretches rather than holding one steady level.",
  },
  {
    name: "Dense Rosette Field",
    code: "K3R8923946095",
    description: "3-state; settles into a dense field of small pinwheel rosettes fairly quickly and then freezes solid (not a dynamic equilibrium) — but the frozen mosaic itself is visually rich.",
  },
  {
    name: "Fine Lattice Bloom",
    code: "K3R8610067153",
    description: "3-state; hand-picked from the browser's Randomize tool — fine-grained lattice-like bloom texture.",
  },
  { name: "3-State Variant D", code: "K3R5659940303", description: "Hand-picked from the browser's Randomize tool." },
  { name: "3-State Variant G", code: "K3R5163911835", description: "Hand-picked from the browser's Randomize tool." },
  { name: "3-State Variant I", code: "K3R7311101464", description: "Hand-picked from the browser's Randomize tool." },
  { name: "3-State Variant J", code: "K3R10006246910", description: "Hand-picked from the browser's Randomize tool." },
  {
    name: "Vivid Living Mosaic",
    code: "K3R1803260976",
    description: "3-state; low but genuinely nonzero settled activity (~14% of cells changing per generation) with much higher color diversity than the Bloom Field rules — an all-over mosaic texture that keeps quietly churning rather than freezing, though the churn is subtle at a glance.",
  },
  {
    name: "Simmering Field",
    code: "K3R5136658866",
    description: "3-state; low settled activity (~9% of cells changing per generation) with low color diversity (29% of max entropy) — a calm, mostly two-tone field with a gentle simmer.",
  },
  {
    name: "Woven Rosettes",
    code: "K3R2739876512",
    description: "3-state; hand-picked from the browser's Randomize tool.",
  },
  {
    name: "Quiet Drift",
    code: "K3R5746719518",
    description: "3-state; very low settled activity (~3.5% of cells changing per generation, similar to Drifting Embers) with moderate color diversity (56% of max entropy) — a calm field with occasional slow color drift.",
  },
  {
    name: "Pinwheel Rosettes",
    code: "K2R114",
    description: "2-state (binary); freezes almost immediately (under 0.2% of cells still changing after ~50 generations) into a static field of large-scale pinwheel rosette clusters — a frozen mosaic, not a living pattern.",
  },
  {
    name: "Faint Flicker",
    code: "K3R6927663503",
    description: "3-state; freezes almost completely (under 0.05% of cells still changing after ~350 generations) — visually a static mosaic with an occasional isolated flicker, similar in character to Pinwheel Rosettes.",
  },
  {
    name: "Tricolor Streams",
    code: "K3R6804299700",
    description: "3-state; freezes almost immediately (under 0.2% of cells still changing after ~50 generations) into static organic blob/stream domains with rosette boundaries — a frozen mosaic, not a living pattern.",
  },
  {
    name: "Ember Field",
    code: "K4R1086136302530005724072948",
    description: "4-state; warm dominant color with scattered colorful accent bursts.",
  },
  {
    name: "Rare Blooms",
    code: "K5R1129729114610698002154335837306940933331094003",
    description: "5-state; calm two-color base punctuated by rare, colorful rosette blooms.",
  },
  { name: "3-State Variant A", code: "K3R10363801692", description: "Hand-picked from the browser's Randomize tool." },
  { name: "3-State Variant B", code: "K3R440175448", description: "Hand-picked from the browser's Randomize tool." },
  { name: "3-State Variant C", code: "K3R3755880092", description: "Hand-picked from the browser's Randomize tool." },
  { name: "3-State Variant E", code: "K3R9576971195", description: "Hand-picked from the browser's Randomize tool." },
  { name: "3-State Variant F", code: "K3R2349979794", description: "Hand-picked from the browser's Randomize tool." },
  { name: "3-State Variant H", code: "K3R867894112", description: "Hand-picked from the browser's Randomize tool." },
  { name: "3-State Variant K", code: "K3R3826621804", description: "Hand-picked from the browser's Randomize tool." },
];

// 16-neighbor ("edge + vertex") rules — found via
// `experiments/goldilocks_rule_search.py --num-neighbors 16` (1200 random
// trials per state count; see that script for the search criteria) and
// verified over 400 generations (not just the search's 60-generation
// scoring window) before being promoted here — the larger neighbor-sum
// range mixes much more per step than the 3-neighbor case, so a rule can
// look "settled" at 60 generations while still slowly decaying at 400. At
// k=3 with random rules, only ~3/1200 trials were genuinely stable (vs.
// most of the 3-neighbor default's single-entry mutations landing in its
// class) — the goldilocks basin here is real but much narrower, and no
// k=4 trial (0/1200) found a stable living equilibrium at all, so this
// list currently tops out at 3 states.
export const PRESETS_16 = [
  {
    name: "Vertex Rosette Field (default)",
    code: "K3N16R103015167793430793634347264187881395621689945824",
    description:
      "3-state; genuine dynamic equilibrium — settled activity holds flat at ~34% of cells changing per generation from generation 100 through at least generation 400 (not still decaying), with high color diversity (83% of max entropy). Small pinwheel rosettes nucleate densely across an orange-dominant field, distinctly denser/finer-grained than any 3-neighbor rule (the richer 16-cell neighborhood mixes far more per step).",
  },
  {
    name: "Vertex Mosaic (dense, near-frozen)",
    code: "K2N16R15165874216",
    description:
      "2-state (binary); settles into a dense, near-maximal-entropy pinwheel mosaic and then holds almost perfectly still (~0.3% of cells still changing per generation, stable from generation 100 through at least generation 400) — a frozen mosaic in the same spirit as the 3-neighbor 'Dense Rosette Field,' but with the extended neighborhood's characteristic fine pinwheel texture.",
  },
  {
    name: "Vertex Mosaic (variant)",
    code: "K2N16R11266351152",
    description: "2-state (binary); same near-frozen dense-pinwheel character as Vertex Mosaic, slightly higher residual flicker (~0.8% of cells changing per generation).",
  },
];

export const PRESETS_BY_NEIGHBORHOOD = { 3: PRESETS_3, 16: PRESETS_16 };

export function presetsFor(numNeighbors) {
  const presets = PRESETS_BY_NEIGHBORHOOD[numNeighbors];
  if (!presets) throw new Error(`no presets registered for numNeighbors=${numNeighbors}`);
  return presets;
}

export function defaultPresetFor(numNeighbors) {
  return presetsFor(numNeighbors)[0];
}

// Backward-compatible aliases for the (much more common) default neighborhood.
export const PRESETS = PRESETS_3;
export const DEFAULT_PRESET = PRESETS_3[0];
