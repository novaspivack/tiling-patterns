# tiling-patterns

A cellular automaton that runs on an exact **Kisrhombille**-lattice tiling — a hexagon-of-12
30-60-90 triangle grid, updated generation by generation by a local, tunable neighbor rule. Each
cell holds one of `k` states (2 to 9); the next state is a function of the cell's own state and the
sum of its neighbors' states (a generalized outer-totalistic rule, with `k`, the neighborhood, and
the whole transition table exposed and searchable, not fixed). A large library of hand-curated
"goldilocks" rules — found by search over that rule space — settle into a persistent, non-degenerate
dynamic equilibrium instead of freezing solid or dissolving into noise: rosette-like blooms that keep
drifting and reforming, synchronized flickers, slow-growing minority-color fields, and more.

**Live demo:** [novaspivack.github.io/tiling-patterns](https://novaspivack.github.io/tiling-patterns/)

## What it is

- **Lattice:** the Kisrhombille tessellation — the reflective fundamental-domain tiling of the
  Euclidean (2,3,6) triangle group. Every hexagon is exactly 12 congruent 30-60-90 triangles; cell
  identity at any point is found by kaleidoscopic domain-folding (reflecting across the group's
  mirror lines), so no explicit mesh is stored.
- **Rule:** a generalized `k`-state outer-totalistic cellular automaton on that lattice
  (`web/js/rule.js`), running on a single fixed lattice resolution over a large (512×512 hex,
  ×12 triangles/hex) toroidal grid, entirely on the GPU via WebGL2. Rules are named/shared as
  compact `K<states>N<neighbors>R<number>` codes.
- **Two neighborhoods**, toggleable live: the lattice's natural **3** edge-sharing neighbors, or an
  extended **16**-neighbor mode that also sums the 13 vertex-sharing (but non-edge-sharing)
  neighbors — the same rule *number* means a completely different rule under each neighborhood, so
  switching applies that neighborhood's own default preset rather than reinterpreting the current one.
- **Rule presets:** 103 hand-vetted 16-neighbor rules and 30 3-neighbor rules, each watched for
  hundreds of generations and picked for genuinely interesting long-run behavior (not just an
  interesting first few frames) — see `web/js/presets.js` for the full list and characterizations.
- **Manual rule editor:** randomize, paste/copy a rule code, and increment/decrement through
  neighboring rules (press-and-hold accelerates the step size for large jumps).
- **Advanced rule view:** the rule table broken out one row per color, each showing its
  stasis/advance/retreat/other transition breakdown as a bar, a pin toggle (freeze that color's row
  while randomizing/varying the rest), a per-row cyclic push up/down (with live tick-count feedback
  while held), and a per-row reset-to-zero — for methodically finding the critical point where one
  color's behavior changes.
- **15 seed patterns:** density-settable random fill (from ultra-sparse 0.05% scatters up to dense),
  a random "island," several symmetric multi-color seeds (rings, spirals, sector wheels, twin
  blooms, checkerboards), and simple single-cell/single-hex seeds — most are click-to-place so you
  can drop several at different locations before running.
- **Interaction:** pan/paint/place modes (paint by click-drag, place a seed pattern by clicking with
  a hover preview), speed and zoom sliders, 5 color palettes, a live activity/entropy stats graph,
  and a one-click screenshot button.
- **Note:** an earlier, more ambitious design — self-similar multi-level subdivide/merge, with
  cyclic rock-paper-scissors color competition and a level-balance constraint across refinement
  levels — was prototyped in Python (`src/tiling_patterns/geometry.py`, `ca_rule.py`) but did not
  carry forward into the shipped app; the single-level rule above is what actually runs.

## Run the demo locally

```bash
cd web
python3 -m http.server 8000
# open http://localhost:8000/ in a browser with WebGL2 support
```

No build step, no dependencies — `web/` is a static WebGL2 app using native ES modules. It must be
served over HTTP (as above); opening `index.html` directly via a `file://` URL will not work
(browsers block ES module imports under that origin) — the app itself detects this case and shows
an on-page message with the fix.

### Tips for exploring

- For rules with 3 or more colors, try starting from one of the symmetric seed patterns (rings,
  spirals, sector wheels, twin blooms) rather than plain random fill — the extra colors read much
  more clearly against a structured starting point.
- 30% zoom (the default) at higher speeds is a good general-purpose combination for watching a
  rule's long-run character rather than individual cells.
- Some rules that flicker (rapid, near-total per-generation change) read as noisy/static at low
  speed but resolve into a much clearer strobe or pulse effect at higher speeds — worth bumping the
  speed slider up on those before deciding a rule looks like noise.

## Python tools (rule search and geometry checks)

The `tiling_patterns` Python package mirrors the web engine's rule semantics at CPU-search speed
(`outer_totalistic.py`) — used to find and vet candidate rules (`experiments/goldilocks_rule_search.py`,
`explore_rule_neighborhood.py`, `analyze_rule.py`) before hand-curating them into the app's preset
list. It also verifies the lattice's domain-folding geometry (`geometry.py`) and prototypes the
earlier multi-level rule design (`ca_rule.py`, not currently wired into the app — see above).

```bash
conda create -n tiling-patterns python=3.14 -y
conda activate tiling-patterns
pip install -e ".[dev]"
pytest
ruff check src tests experiments scripts
```

```text
src/tiling_patterns/   # CA formalism building blocks — geometry, rule prototypes
tests/                 # pytest
experiments/           # Reproducible demo/verification scripts
web/                   # WebGL2 shader app (the real, fast, interactive automaton)
```

## Related work

The **Kisrhombille tiling** itself is well established in tiling theory: John Conway named it (the
"kis" operator — adding a center point and quartering — applied to the rhombille tiling); it is the
dual of the [great rhombitrihexagonal tiling](https://en.wikipedia.org/wiki/Truncated_trihexagonal_tiling),
face configuration V4.6.12. The specific visual inspiration for this project was
[John Greene's `Geom_Kisrhombille`](https://github.com/johnalexandergreene/Geom_Kisrhombille) —
a coordinate-system and shape-grammar toolkit built on this tiling (used for his Forsythia fractal
generative art), not a cellular automaton.

There is existing academic work specifically on this tiling's *geometry*: Fatma Kablan, Béla
Vízvári, and Benedek Nagy (Eastern Mediterranean University) published digital-distance formulas
for it — ["A digital distance on the kisrhombille tiling"](https://doi.org/10.1107/s2053273323010628)
(Acta Cryst. A, 2024) and
["Digital distance in the kisrhombille grid with the edge neighborhood"](https://doi.org/10.1107/s2053273325008095)
(Acta Cryst. A, 2025). Both independently distinguish "edge neighbors" from "edge *and* vertex
neighbors" — the same two neighborhood classes this project's 3-neighbor/16-neighbor toggle
implements — but for shortest-path distance, not evolving states. The same group has studied actual
cellular automaton *dynamics* on the related-but-distinct plain triangular grid (e.g.
["Cellular Automata Approach to Mathematical Morphology in the Triangular Grid"](https://doi.org/10.12700/aph.15.6.2018.6.3),
Acta Polytechnica Hungarica, 2018), not on the Kisrhombille tiling.

The generalized *outer-totalistic-rule-on-an-arbitrary-tiling* framework this project's
`K<states>N<neighbors>R<number>` rule encoding builds on traces back to Stephen Wolfram's
*A New Kind of Science* (2002), which explicitly demonstrates outer-totalistic cellular automata on
triangular lattices, pentagonal tilings, and even non-repetitive Penrose tilings, each rule
"specified by an outer-totalistic code number."

As far as could be determined from the above search, no prior work runs an actual evolving,
generation-by-generation cellular automaton on the Kisrhombille tiling specifically — this project's
combination of that lattice with a searchable, GPU-accelerated, multi-state, multi-neighborhood
outer-totalistic rule space (and the curated "goldilocks" rules that came out of searching it)
appears to be new. None of the presets in `web/js/presets.js` are drawn from an existing published
rule catalog — there wasn't one to draw from.

## License

[**PolyForm Noncommercial 1.0.0**](LICENSE)
