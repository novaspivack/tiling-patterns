# tiling-patterns

A cellular automaton that grows exact **Kisrhombille**-lattice tilings — a hexagon-of-12 30-60-90
triangle grid, refined and colored generation by generation by local neighbor rules, at several
nested zoom levels at once. Dense, finely subdivided regions blend into large flat-colored
triangles, and rock-paper-scissors-style color competition spontaneously nucleates hexagonal
rosette motifs — the same visual family as hand-built recursive tiling fractals, produced instead
by a bottom-up, purely local update rule.

**Live demo:** https://novaspivack.github.io/tiling-patterns/ (WebGL2, runs in any modern browser,
no install required)

## What it is

- **Lattice:** the Kisrhombille tessellation — the reflective fundamental-domain tiling of the
  Euclidean (2,3,6) triangle group. Every hexagon is exactly 12 congruent 30-60-90 triangles; cell
  identity at any point is found by kaleidoscopic domain-folding (reflecting across the group's
  mirror lines), so no explicit mesh is stored.
- **Multi-scale:** a fixed stack of self-similar zoom levels of the same lattice. Cells subdivide
  into the next-finer level when locally active, merge back when quiet, and a level-balance rule
  forbids adjacent regions from differing by more than one level — this is what produces the
  graded density falloff between fine mesh and flat color.
- **Color:** a small cyclic palette (rock-paper-scissors-style transitions) drives spontaneous
  rosette nucleation at competition fronts.

## Run the demo locally

```bash
cd web
python3 -m http.server 8000
# open http://localhost:8000/ in a browser with WebGL2 support
```

No build step, no dependencies — `web/` is a static WebGL2 app.

## Python tools (rule prototyping and geometry checks)

The `tiling_patterns` Python package holds small, testable pieces used to design and verify the
automaton before it runs in the shader: the domain-folding geometry, and a small-grid prototype of
the transition rule.

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
