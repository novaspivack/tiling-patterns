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
  {
    name: "Wandering Motes",
    code: "K3R9394323876",
    description:
      "3-state; from the app's default sparse seed, settles into a mostly-quiet field (~7-12% activity, ~91% background color) with two small, persistent minority-color populations (~4-5% each) — similar character to the Edge-of-Chaos family. Found via a dedicated isolated-seed search for long-lived translating structures (experiments/glider_persistence_search.py): from a small isolated perturbation on an empty grid, this rule reliably produces a compact 4-21-cell structure that survives 2000+ generations without dying, exploding, or freezing solid, continuously changing shape — but rigorous long-run tracking showed it wanders within a bounded ~2-unit neighborhood of its start rather than making unbounded net progress in a fixed direction, so it is a genuine long-lived \"wobbler,\" not a translating glider/spaceship. No rule found in that search (tens of thousands of random 2-9 state trials, both neighborhoods) produced a true unboundedly-translating structure — see the script's own diagnostic output and docs/KEY_LEARNINGS.md for the full investigation.",
  },
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
// k=4 trial (0/1200) found a stable living equilibrium at all — but a
// user-submitted k=4 rule (Vertex Quartet, below) is a genuine stable
// counterexample, so a 4-state living equilibrium is rare under random
// search but not impossible. The first entry is the app-wide default
// neighborhood/rule on startup — see main.js.
export const PRESETS_16 = [
  {
    name: "Goldilocks Zone (default)",
    code: "K2N16R204808",
    description:
      "2-state (binary); default 16-neighbor rule, submitted as \"goldilocks zone\" — very balanced and stable, with sparse, ongoing regions of activity rather than gliders. From the app's default sparse seed: settles to a very low but genuinely nonzero, non-decaying activity plateau (~1-3% of cells changing per generation, stable from generation 100 through at least generation 500) with a small persistent minority-color population (~1.5-1.8%) — a calm, mostly-quiet field with small pockets of ongoing change rather than a dead freeze. Picked as the new default over Glider Waves (3) below.",
  },
  {
    name: "Dense Goldilocks",
    code: "K2N16R201992",
    description:
      "2-state (binary); submitted as \"dense goldilocks\" — same stable living-equilibrium character as Goldilocks Zone but considerably denser: settles to ~19-20% activity (stable from generation 250 onward) with a larger minority-color population (~10-11%).",
  },
  {
    name: "Goldilocks Zone (medium density)",
    code: "K2N16R185864",
    description:
      "2-state (binary); submitted as a medium-density variant of the Goldilocks Zone/Dense Goldilocks family — settles to ~11-14% activity (stable from generation 250 onward) with a minority-color population of ~7.5-8%, between Goldilocks Zone (default) and Dense Goldilocks in both activity level and density.",
  },
  {
    name: "Glider Waves (3)",
    code: "K2N16R205320",
    description:
      "2-state (binary); submitted as \"glider waves 3\" — a further refinement of the Glider Waves family below. Previous default, superseded by Goldilocks Zone above.",
  },
  {
    name: "Glider Fronts (sparser)",
    code: "K2N16R207368",
    description:
      "2-state (binary); a sparse field of small traveling-looking structures that drift and interact against a mostly-quiet background, rather than a dense packed texture — an easier pattern to visually track individual structures in than the denser rules below. (Not actually validated as self-sustaining gliders in isolation — see experiments/glider_persistence_search.py and Wandering Motes below.)",
  },
  {
    name: "Vertex Duet",
    code: "K2N16R1006017859",
    description:
      "2-state (binary); the liveliest of the curated 16-neighbor rules — settled activity holds flat at ~40% of cells changing per generation from generation 100 through at least generation 400, with near-maximal color diversity (97% of max entropy). Dense, sharply-defined orange/blue pinwheel rosettes packed edge-to-edge across the whole field.",
  },
  {
    name: "Vertex Duet (variant A)",
    code: "K2N16R4184168593",
    description: "2-state (binary); same genuinely stable living-equilibrium character as Vertex Duet (~36% settled activity, 98% of max entropy), slightly calmer and more blue-dominant.",
  },
  {
    name: "Vertex Duet (variant B)",
    code: "K2N16R4184168463",
    description: "2-state (binary); stable living equilibrium at ~27% settled activity with the highest color diversity of this group (99.6% of max entropy) — a finer, more evenly mixed pinwheel texture than the denser Vertex Duet variants.",
  },
  {
    name: "Vertex Duet (variant C)",
    code: "K2N16R1006017797",
    description: "2-state (binary); stable living equilibrium at ~32% settled activity with very high color diversity (99.5% of max entropy).",
  },
  {
    name: "Vertex Duet (variant D)",
    code: "K2N16R4184168584",
    description: "2-state (binary); stable living equilibrium at ~32% settled activity, 95% of max entropy.",
  },
  {
    name: "Vertex Duet (variant E)",
    code: "K2N16R4184168321",
    description: "2-state (binary); stable living equilibrium at ~31% settled activity, 95% of max entropy.",
  },
  {
    name: "Vertex Duet (calmer variant F)",
    code: "K2N16R4184168471",
    description: "2-state (binary); calmer stable equilibrium at ~28% settled activity, 98% of max entropy.",
  },
  {
    name: "Vertex Duet (calmer variant G)",
    code: "K2N16R4184127521",
    description: "2-state (binary); calmer stable equilibrium at ~27% settled activity, 91% of max entropy.",
  },
  {
    name: "Vertex Duet (calmer variant H)",
    code: "K2N16R4184168065",
    description: "2-state (binary); calmer stable equilibrium at ~24% settled activity, 90% of max entropy.",
  },
  {
    name: "Vertex Duet (calmer variant I)",
    code: "K2N16R4184168513",
    description: "2-state (binary); calmer stable equilibrium at ~24% settled activity, 89% of max entropy.",
  },
  {
    name: "Vertex Duet (calmer variant J)",
    code: "K2N16R16103090934",
    description:
      "2-state (binary) — despite the '3' that might suggest otherwise, the rule code's K prefix is what carries the state count, and this one says K2: it decodes as 2-state, not 3-state (see docs/KEY_LEARNINGS.md if a rule code's actual state count is ever in doubt). Calmer stable equilibrium at ~27% settled activity, 83% of max entropy.",
  },
  {
    name: "Fading Vertex Duet",
    code: "K2N16R4184168384",
    description:
      "2-state (binary); still slowly decaying even by generation 900 (~10% activity at gen 100, ~3% by gen 900, decay rate dropping sharply) rather than a settled equilibrium — included for its rich, near-maximal-entropy (93%) texture during the long decay, not as a stable pick.",
  },
  {
    name: "Quiet Vertex Duet",
    code: "K2N16R4184168577",
    description: "2-state (binary); quieter stable equilibrium at ~17% settled activity, 85% of max entropy.",
  },
  {
    name: "Slow-Fading Vertex Field",
    code: "K2N16R16103090944",
    description:
      "2-state (binary) — like the 'calmer variant J' entry above, this decodes as 2-state despite the number suggesting otherwise. Still slowly decaying at generation 400 (not yet a settled equilibrium: ~17% activity at gen 100, ~9% at gen 400) — included for its rich near-maximal-entropy texture on the way down, not as a stable pick.",
  },
  {
    name: "Vivid Vertex Rosettes",
    code: "K3N16R17488889006862679878961727916943008164378058140",
    description:
      "3-state; a distinct, more turbulent rule than the Vertex Rosette Field family below — stable living equilibrium at ~59% settled activity with very high color diversity (95% of max entropy), giving a dense 3-color (orange/green/blue) pinwheel weave rather than one dominant background color.",
  },
  {
    name: "Vertex Rosette Field",
    code: "K3N16R103015167793430793634347264187881395621689945824",
    description:
      "3-state; genuine dynamic equilibrium — settled activity holds flat at ~34% of cells changing per generation from generation 100 through at least generation 400 (not still decaying), with high color diversity (83% of max entropy). Small pinwheel rosettes nucleate densely across an orange-dominant field, distinctly denser/finer-grained than any 3-neighbor rule (the richer 16-cell neighborhood mixes far more per step).",
  },
  {
    name: "Vertex Rosette Field (variant G)",
    code: "K3N16R103015167793430793634347264187881395621689945820",
    description: "3-state; a rule-table variant of Vertex Rosette Field so close it was indistinguishable from the default in every trajectory metric tested (~34% settled activity, 83% of max entropy) — included since it is a genuinely different rule number, even though it behaves identically in practice.",
  },
  {
    name: "Vertex Rosette Field (variant H)",
    code: "K3N16R103015167793430793634347264187881395621689945825",
    description: "3-state; another rule-table variant indistinguishable from the default in every trajectory metric tested (~34% settled activity, 83% of max entropy) — same caveat as variant G.",
  },
  {
    name: "Vertex Rosette Field (variant A)",
    code: "K3N16R103015167793430793634347264187881395621689945799",
    description: "3-state; same living-equilibrium character as Vertex Rosette Field (~34% settled activity, 84% of max entropy) — a nearby rule-table variant, visually indistinguishable in practice.",
  },
  {
    name: "Vertex Rosette Field (variant B)",
    code: "K3N16R103015167793430793634347264187881395621689945787",
    description: "3-state; same living-equilibrium character as Vertex Rosette Field (~35% settled activity, 85% of max entropy).",
  },
  {
    name: "Vertex Rosette Field (variant C)",
    code: "K3N16R103015167793430793634347264187881395621689945776",
    description: "3-state; same living-equilibrium character as Vertex Rosette Field (~35% settled activity, 84% of max entropy).",
  },
  {
    name: "Vertex Rosette Field (variant D)",
    code: "K3N16R103015167793430793634347264187881395621689945703",
    description: "3-state; same living-equilibrium character as Vertex Rosette Field (~34% settled activity, 83% of max entropy).",
  },
  {
    name: "Vertex Rosette Field (variant E)",
    code: "K3N16R103015167793430793634347264187881395621689945645",
    description: "3-state; same living-equilibrium character as Vertex Rosette Field (~35% settled activity, 85% of max entropy).",
  },
  {
    name: "Vertex Rosette Field (variant F)",
    code: "K3N16R103015167793430793634347264187881395621689945575",
    description: "3-state; same living-equilibrium character as Vertex Rosette Field (~34% settled activity, 85% of max entropy).",
  },
  {
    name: "Vertex Duet (wigglers)",
    code: "K2N16R12",
    description: "2-state (binary); stable living equilibrium at ~37% settled activity, moderate color diversity (68% of max entropy) — livelier but more two-toned than the main Vertex Duet variants; small wiggling/oscillating structures.",
  },
  {
    name: "Vertex Duet (variant L)",
    code: "K2N16R1001000001",
    description: "2-state (binary); stable living equilibrium at ~25% settled activity with near-maximal color diversity (99.5% of max entropy).",
  },
  {
    name: "Vertex Duet (variant M)",
    code: "K2N16R1008000008",
    description: "2-state (binary); stable living equilibrium at ~26% settled activity, moderate color diversity (69% of max entropy).",
  },
  {
    name: "Vertex Duet (variant O)",
    code: "K2N16R246194049",
    description: "2-state (binary); settled living equilibrium at ~21% settled activity (gentle downward drift from ~24% at gen 100, largely leveled off by gen 600), 82% of max entropy.",
  },
  {
    name: "Vertex Duet (variant N)",
    code: "K2N16R1010000002",
    description: "2-state (binary); stable living equilibrium at ~24% settled activity, 80% of max entropy.",
  },
  {
    name: "Vertex Ember (calm)",
    code: "K2N16R1000000002",
    description: "2-state (binary); settles to a very low, steady simmer (~1% of cells changing per generation) with fairly high color diversity (84% of max entropy) for how little is moving — a much calmer sibling of the main Vertex Duet family.",
  },
  {
    name: "Vertex Ember (variant)",
    code: "K2N16R1500000001",
    description: "2-state (binary); very low, steady simmer (~2.7% of cells changing per generation), 73% of max entropy.",
  },
  {
    name: "Vertex Ember (variant B)",
    code: "K2N16R1006016704",
    description: "2-state (binary); very low, steady simmer (~2.6% of cells changing per generation), 67% of max entropy.",
  },
  {
    name: "Vertex Rosette Bloom (variant G)",
    code: "K3N16R167179288139610273436421531147705326271258902751",
    description: "3-state; stable living equilibrium at ~52% settled activity, near-maximal color diversity (99% of max entropy).",
  },
  {
    name: "Vertex Rosette Bloom (variant H)",
    code: "K3N16R167179288139610273436421531147705326271507114564",
    description: "3-state; stable living equilibrium at ~42% settled activity, 99% of max entropy.",
  },
  {
    name: "Vertex Rosette Bloom (variant I)",
    code: "K3N16R167179288139610273436421531147705326271507291034",
    description: "3-state; stable living equilibrium at ~46% settled activity, near-maximal color diversity (100% of max entropy).",
  },
  {
    name: "Vertex Rosette Bloom (variant J)",
    code: "K3N16R167179288139610273436421531147705326273046957099",
    description: "3-state; stable living equilibrium at ~56% settled activity, 93% of max entropy.",
  },
  {
    name: "Vertex Rosette Bloom (variant K)",
    code: "K3N16R167179288139610273436421531147705326272765661516",
    description: "3-state; stable living equilibrium at ~51% settled activity, 98% of max entropy.",
  },
  {
    name: "Turbulent Vertex Field (variant B)",
    code: "K3N16R63584775683932601350967461771593475683552281009",
    description: "3-state; another highly turbulent stable rule — settled activity holds flat at ~68% of cells changing per generation, 94% of max entropy.",
  },
  {
    name: "Turbulent Vertex Field (variant C)",
    code: "K3N16R63584775683932601350967461771593475683547867855",
    description: "3-state; turbulent stable rule at ~54% settled activity, 97% of max entropy.",
  },
  {
    name: "Vertex Duet (variant P)",
    code: "K2N16R8482378383",
    description: "2-state (binary); stable living equilibrium at ~28% settled activity, 95% of max entropy.",
  },
  {
    name: "Vertex Duet (variant Q)",
    code: "K2N16R8482378449",
    description: "2-state (binary); stable-ish living equilibrium at ~24% settled activity (gentle downward drift), 84% of max entropy.",
  },
  {
    name: "Vertex Ember (variant C)",
    code: "K2N16R8482378369",
    description: "2-state (binary); very calm, stable simmer at ~2% settled activity, 78% of max entropy.",
  },
  {
    name: "Fading Vertex Duet (variant B)",
    code: "K2N16R8482509441",
    description: "2-state (binary); still slowly decaying at generation 500 (~18% activity at gen 100, ~9% by gen 500) rather than fully settled — included for its texture during the decay, 93% of max entropy.",
  },
  {
    name: "Fading Vertex Duet (variant C)",
    code: "K2N16R8483164801",
    description: "2-state (binary); still slowly decaying at generation 500 (~19% activity at gen 100, ~12% by gen 500), 92% of max entropy.",
  },
  {
    name: "Fading Vertex Duet (variant D)",
    code: "K2N16R8483295873",
    description: "2-state (binary); still slowly decaying at generation 500 (~19% activity at gen 100, ~15% by gen 500), 93% of max entropy.",
  },
  {
    name: "Slow-Fading Vertex Field (variant B)",
    code: "K2N16R8484606593",
    description: "2-state (binary); decays much further than its siblings — from ~11% activity at gen 100 down to under 1% by gen 500 — included for its texture on the way down, not as a stable pick.",
  },
  {
    name: "Vertex Duet (variant R)",
    code: "K2N16R8487752321",
    description: "2-state (binary); stable-ish living equilibrium at ~16% settled activity (gentle downward drift), near-maximal color diversity (98% of max entropy).",
  },
  {
    name: "Vertex Duet (variant S)",
    code: "K2N16R8487752331",
    description: "2-state (binary); stable living equilibrium at ~23% settled activity, 89% of max entropy.",
  },
  {
    name: "Vertex Duet (variant T)",
    code: "K2N16R8487752351",
    description: "2-state (binary); stable living equilibrium at ~22% settled activity, 86% of max entropy.",
  },
  {
    name: "Vertex Duet (variant U)",
    code: "K2N16R8487752383",
    description: "2-state (binary); stable-ish living equilibrium at ~22% settled activity (gentle downward drift), 82% of max entropy.",
  },
  {
    name: "Turbulent Vertex Field (variant D)",
    code: "K3N16R67621017273582108520000122195222769429967731350",
    description: "3-state; the most turbulent stable rules found yet — settled activity holds flat at ~68% of cells changing per generation, 96% of max entropy.",
  },
  {
    name: "Turbulent Vertex Field (variant E)",
    code: "K3N16R67621017273579080010870624199189064964804763459",
    description: "3-state; same highly turbulent stable character as variant D — ~68% settled activity, 96% of max entropy.",
  },
  {
    name: "Turbulent Vertex Field (variant F)",
    code: "K3N16R67621017273575155310264029857419101043295715276",
    description: "3-state; same highly turbulent stable character as variant D — ~68% settled activity, 96% of max entropy.",
  },
  {
    name: "Vertex Duet (variant V)",
    code: "K2N16R8479101701",
    description: "2-state (binary); stable living equilibrium at ~27% settled activity, near-maximal color diversity (99% of max entropy).",
  },
  {
    name: "Slow-Fading Vertex Field (variant C)",
    code: "K2N16R8479101698",
    description: "2-state (binary); decays sharply — from ~10% activity at gen 100 down to under 1% by gen 500 — included for its texture on the way down, not as a stable pick.",
  },
  {
    name: "Turbulent Vertex Field (variant G)",
    code: "K3N16R50544774313814502760183179737693435322631818989",
    description: "3-state; stable living equilibrium at ~56% settled activity, 85% of max entropy.",
  },
  {
    name: "Rising Vertex Bloom",
    code: "K3N16R28554514649552541143697439180084848",
    description:
      "3-state; unusual growth curve — starts low (~6% activity at gen 100), *rises* to ~33% by gen 250 and holds there through at least gen 500, rather than the more common decay-to-plateau — 59% of max entropy once settled.",
  },
  {
    name: "Frozen Vertex Void",
    code: "K3N16R26236778070855095122049361413376270",
    description: "3-state; collapses completely to a single uniform color within the first few generations (0% activity throughout the test) — included for completeness, not as a living pick.",
  },
  {
    name: "Edge-of-Chaos Vertex Field",
    code: "K3N16R3924700606594348935592991799117591",
    description:
      "3-state; stable living equilibrium at ~30% settled activity, but with a strongly asymmetric state mix (from the app's default sparse seed) — ~83% state 0, ~5% state 1, ~12% state 2 — a large dominant background color with small, persistent minority-color populations at the edge of dying out, rather than an even 3-way split.",
  },
  {
    name: "Edge-of-Chaos Vertex Field (variant A)",
    code: "K3N16R3708378525915920576791759941271089",
    description: "3-state; same asymmetric-minority-color character as Edge-of-Chaos Vertex Field — ~27% settled activity, ~85% state 0, ~5% state 1, ~11% state 2.",
  },
  {
    name: "Edge-of-Chaos Vertex Field (variant B)",
    code: "K3N16R463547315739496228758547452900837",
    description: "3-state; same character, with an even smaller minority-color population — ~26% settled activity, ~86% state 0, ~3.6% state 1, ~10% state 2.",
  },
  {
    name: "Edge-of-Chaos Vertex Field (variant C)",
    code: "K3N16R229764952834873481827613120564297256",
    description: "3-state; same asymmetric character but with larger, more balanced minority populations — ~32% settled activity, ~78% state 0, ~11% state 1, ~11% state 2.",
  },
  {
    name: "Edge-of-Chaos Vertex Field (unstable variant)",
    code: "K3N16R4450054231099096180116572419708437",
    description:
      "3-state; genuinely borderline — with the app's default sparse seed it slowly dies out toward near-zero activity (~2.5% at gen 100, under 1% by gen 500, over 99% state 0), but the small residual minority-color population never quite vanishes across repeated seeds — right at the edge between living and frozen.",
  },
  // Batch of 2-state rules submitted with their own characterization labels
  // (visually vetted by the submitter, not independently re-measured here —
  // descriptions below reflect the submitted label directly).
  {
    name: "Vertex Mosaic (frozen, balanced mix)",
    code: "K2N16R17179738124",
    description:
      "2-state (binary); freezes completely (0% activity by generation 100, confirmed across repeated seeds) into a static mosaic with a near-even 2-color split (~55-58%/42-45%) and near-maximal entropy (~0.98) — a frozen pattern rather than a living one.",
  },
  {
    name: "Vertex Wheels (difficult)",
    code: "K2N16R1511517186",
    description: "2-state (binary); submitted as \"difficult wheels\" — rotating pinwheel-like structures that are harder to sustain/stabilize than the calmer wheel variants below.",
  },
  {
    name: "Vertex Triangles",
    code: "K2N16R12845511085",
    description: "2-state (binary); submitted as \"triangles\" — triangular structures visible in the settled pattern.",
  },
  {
    name: "Vertex Triangles and Wheels",
    code: "K2N16R12845510991",
    description: "2-state (binary); submitted as \"triangles and wheels\" — a mix of triangular and rotating pinwheel structures.",
  },
  {
    name: "Vertex Billows",
    code: "K2N16R17179837668",
    description: "2-state (binary); submitted as \"billows\" — smooth, undulating large-scale movement.",
  },
  {
    name: "Vertex Wheels (light)",
    code: "K2N16R15915434015",
    description: "2-state (binary); submitted as \"light wheels\" — a lighter-toned rotating-pinwheel variant.",
  },
  {
    name: "Vertex Wheels (dark)",
    code: "K2N16R14021622082",
    description: "2-state (binary); submitted as \"dark wheels\" — a darker-toned rotating-pinwheel variant.",
  },
  {
    name: "Flashing Fans",
    code: "K2N16R2178574594",
    description: "2-state (binary); submitted as \"flashing fans\" — fan-shaped structures that flicker/flash.",
  },
  {
    name: "Flashing Fans (variant)",
    code: "K2N16R2178574595",
    description: "2-state (binary); submitted as \"flashing fans 2\" — a close variant of Flashing Fans (differs from it by 1 in rule number).",
  },
  {
    name: "Interesting Fans",
    code: "K2N16R5841480257",
    description: "2-state (binary); submitted as \"interesting fans\" — another fan-structure variant, distinct from the Flashing Fans family.",
  },
  {
    name: "Flashing Fans (balanced)",
    code: "K2N16R2994379279",
    description: "2-state (binary); submitted as \"flashing fans balanced\" — a more evenly-balanced variant of the flashing-fan character.",
  },
  {
    name: "Molecular Soup",
    code: "K2N16R6841480257",
    description: "2-state (binary); submitted as \"molecular soup\" — loose, blob-like clusters drifting and interacting like a fluid of molecules.",
  },
  {
    name: "Better Molecules",
    code: "K2N16R10708811394",
    description: "2-state (binary); submitted as \"better molecules\" — a refined variant of the Molecular Soup character.",
  },
  {
    name: "Vertex Blinkers",
    code: "K2N16R10742042369",
    description: "2-state (binary); submitted as \"blinkers\" — cells or small clusters that flash on/off in place.",
  },
  {
    name: "Vertex Blinkers (moving)",
    code: "K2N16R10742042371",
    description: "2-state (binary); submitted as \"moving blinkers\" — the blinker character above, but the flashing structures also travel.",
  },
  {
    name: "Balanced Explorer",
    code: "K2N16R16708328200",
    description: "2-state (binary); submitted as \"balanced explorer\" — structures that spread/explore the grid with a balanced overall character.",
  },
  {
    name: "Vertex Crescents",
    code: "K2N16R16708333728",
    description: "2-state (binary); submitted as \"crescents\" — curved, arc-shaped structures.",
  },
  {
    name: "Vertex Bacteria",
    code: "K2N16R16708372301",
    description: "2-state (binary); submitted as \"bacteria\" — small, organic-looking scattered structures.",
  },
  {
    name: "Glider Waves",
    code: "K2N16R211464",
    description: "2-state (binary); submitted as \"glider waves\" — traveling structures (gliders) moving in wave-like fronts.",
  },
  {
    name: "Glider Waves (variant)",
    code: "K2N16R211336",
    description: "2-state (binary); submitted as \"glider waves 2\" — a close variant of Glider Waves.",
  },
  {
    name: "Glider Fronts",
    code: "K2N16R210440",
    description: "2-state (binary); submitted as \"glider fronts\" — traveling structures organized into moving fronts, denser than Glider Fronts (sparser) above.",
  },
  {
    name: "Glider Fans",
    code: "K2N16R16852987912",
    description: "2-state (binary); submitted as \"glider fans\" — traveling structures that spread out in fan-like arrangements.",
  },
  {
    name: "Vertex Blobs",
    code: "K2N16R16852986925",
    description: "2-state (binary); submitted as \"blobs\" — soft, rounded clustered regions.",
  },
  {
    name: "Jax",
    code: "K2N16R4266578766",
    description: "2-state (binary); submitted as \"jax\" — a distinctive pattern named directly by the submitter.",
  },
  {
    name: "Dragon Skin",
    code: "K2N16R4266580515",
    description: "2-state (binary); submitted as \"dragon skin\" — a scaly, textured large-scale pattern.",
  },
  {
    name: "Dragon Skin (variant)",
    code: "K2N16R4266580613",
    description: "2-state (binary); submitted as \"dragon skin 2\" — a variant of the Dragon Skin texture.",
  },
  {
    name: "Red Ants",
    code: "K2N16R6755821186",
    description: "2-state (binary); submitted as \"red ants\" — small, scattered, motile structures.",
  },
  {
    name: "Vertex Colonies",
    code: "K2N16R1596988432",
    description: "2-state (binary); submitted as \"colonies\" — clustered groups of structures that hold together.",
  },
  {
    name: "Vertex Horseshoes",
    code: "K2N16R9096545284",
    description: "2-state (binary); submitted as \"horseshoes\" — U-shaped/horseshoe-shaped structures.",
  },
  {
    name: "Strobing Vertex Triad",
    code: "K3N16R463547315739496231538077736178591",
    description:
      "3-state; near-total per-generation change (~97% of cells differ every single step), but this is a synchronized flicker, not decorrelating turbulence — cells 2/4/6 steps apart differ by only ~5-20%, so most of the grid is locked in a fast, globally-synchronized 2-phase strobe between two of the three colors, layered over a third color's more slowly-drifting, semi-stable skeleton. Reads as a stable underlying structure with the other two colors flickering across it every generation, rather than a boiling/churning turbulence. Balanced overall mix (~50%/33%/17%) and high entropy (~0.92) throughout.",
  },
  {
    name: "Vertex Quartet",
    code: "K4N16R8074722502326595458059341820121109397250800631134857891122471857963950706668180543119754287752182043860075181252508120",
    description:
      "4-state; the first stable living equilibrium found at k=4 under this neighborhood (a random search over 1200 4-state trials found none) — settled activity holds flat at ~65% of cells changing per generation from generation 100 through at least generation 500, with near-maximal color diversity (97% of max entropy).",
  },
  {
    name: "Turbulent Vertex Field (variant)",
    code: "K3N16R101356818320019715368486541822367752467920189986",
    description: "3-state; another highly turbulent stable rule — settled activity holds flat at ~65% of cells changing per generation, 93% of max entropy.",
  },
  {
    name: "Turbulent Vertex Field",
    code: "K3N16R51291680085950450002668124196305513463105723991",
    description: "3-state; the most turbulent stable rule in this list — settled activity holds flat at ~71% of cells changing per generation, with very high color diversity (96% of max entropy).",
  },
  {
    name: "Vertex Rosette Bloom",
    code: "K3N16R26349043154162526143891210047497607823765666030",
    description: "3-state; stable living equilibrium at ~58% settled activity, 83% of max entropy.",
  },
  {
    name: "Vertex Rosette Bloom (calmer variant)",
    code: "K3N16R26349043154162526143891210047497607823800183917",
    description: "3-state; stable living equilibrium at ~52% settled activity, 92% of max entropy.",
  },
  {
    name: "Vertex Rosette Bloom (calmest variant)",
    code: "K3N16R26349043154162526143891210047497607823800183147",
    description: "3-state; stable living equilibrium at ~43% settled activity, 85% of max entropy.",
  },
  {
    name: "Quiet Vertex Rosettes",
    code: "K3N16R6818535212130415045039618357116624139532942753",
    description: "3-state; calmer stable living equilibrium at ~14% settled activity, 75% of max entropy.",
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
