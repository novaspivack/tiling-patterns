// Curated "goldilocks" rules — see experiments/goldilocks_rule_search.py,
// experiments/explore_rule_neighborhood.py, and experiments/analyze_rule.py
// for the search/analysis methodology. Ordering is by observed quality
// (measured settled-activity plus visual character), best first, per
// feedback from watching each rule run for hundreds of generations —
// not just whether it initially looks promising.

export const PRESETS = [
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

export const DEFAULT_PRESET = PRESETS[0];
