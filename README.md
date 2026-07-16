# tiling-patterns

A cellular automaton that runs on an exact **Kisrhombille**-lattice tiling — a hexagon-of-12
30-60-90 triangle grid, updated generation by generation by a local, tunable neighbor rule. Each
cell holds one of `k` states; the next state is a function of the cell's own state and the sum of
its 3 triangle-edge neighbors' states (a generalized outer-totalistic rule, with `k` and the whole
transition table exposed and searchable, not fixed). A handful of "goldilocks" rules — found by
random/targeted search over that rule space — settle into a persistent, non-degenerate dynamic
equilibrium instead of freezing solid or dissolving into noise: small rosette-like blooms keep
drifting, reforming, and interacting indefinitely rather than the pattern going static.

**Live demo:** not yet published (repo is currently private; publishing to GitHub Pages is a
pending, owner-approval-gated step — see `web/` to run it locally in the meantime).

## What it is

- **Lattice:** the Kisrhombille tessellation — the reflective fundamental-domain tiling of the
  Euclidean (2,3,6) triangle group. Every hexagon is exactly 12 congruent 30-60-90 triangles; cell
  identity at any point is found by kaleidoscopic domain-folding (reflecting across the group's
  mirror lines), so no explicit mesh is stored.
- **Rule:** a generalized `k`-state outer-totalistic cellular automaton on that lattice (`web/js/rule.js`),
  running on a single fixed lattice resolution over a large (512×512 hex, ×12 triangles/hex)
  toroidal grid. Rules are named/shared as compact `K<states>R<number>` codes.
- **Interactive controls:** run/pause/step/reset, speed and zoom, a curated rule-presets dropdown
  plus a manual rule editor (randomize, increment/decrement through neighboring rules, paste a
  code), several color palettes, named seed patterns (including click-to-place), a paint tool, and
  a live activity/entropy stats panel.
- **Note:** an earlier, more ambitious design (self-similar multi-level subdivide/merge with
  cyclic rock-paper-scissors color competition — see `specs/.../SPEC_002_KRB_KISRHOMBILLE_CA_FORMALISM.md`)
  was prototyped in Python (`src/tiling_patterns/geometry.py`, `ca_rule.py`) but did not carry
  forward into the shipped app; the single-level rule above is what actually runs.

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

## License

[**PolyForm Noncommercial 1.0.0**](LICENSE)
