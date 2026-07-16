"""Render a static preview image of a rule's settled state, for visually
vetting candidates from `goldilocks_rule_search.py` before promoting any to
`web/js/presets.js`.

Run: `python experiments/render_rule_preview.py K3R6804299700 K2R114 ...`
Output: one PNG per rule code in `experiments/output/`.
"""

from __future__ import annotations

import random
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.collections import PolyCollection

from tiling_patterns.geometry import HexCoord, hex_center, sector_corners
from tiling_patterns.outer_totalistic import ToroidalGrid, decode_rule, step

EDGE_LENGTH = 1.0
GRID_SIZE = 30
GENERATIONS = 60
PALETTE = plt.get_cmap("tab10").colors


def render_grid(grid: np.ndarray, num_states: int, title: str, output_path: Path) -> None:
    height, width, _ = grid.shape
    polygons = []
    colors = []
    for r in range(height):
        for q in range(width):
            cx, cy = hex_center(HexCoord(q, r), EDGE_LENGTH)
            for sector in range(12):
                o, m, v = sector_corners(sector, EDGE_LENGTH)
                polygons.append([(cx + o[0], cy + o[1]), (cx + m[0], cy + m[1]), (cx + v[0], cy + v[1])])
                colors.append(PALETTE[int(grid[r, q, sector]) % len(PALETTE)])

    fig, ax = plt.subplots(figsize=(9, 9))
    collection = PolyCollection(polygons, facecolors=colors, edgecolors="black", linewidths=0.15)
    ax.add_collection(collection)
    ax.set_xlim(-EDGE_LENGTH, EDGE_LENGTH * (width + height) * 0.9)
    ax.set_ylim(-EDGE_LENGTH, EDGE_LENGTH * height * 1.6)
    ax.set_aspect("equal")
    ax.set_title(title)
    ax.axis("off")
    fig.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)


def main() -> None:
    codes = sys.argv[1:]
    if not codes:
        raise SystemExit("usage: python experiments/render_rule_preview.py <ruleCode> [<ruleCode> ...]")

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)

    for code in codes:
        num_states, table = decode_rule(code)
        rng = random.Random(hash(code) & 0xFFFFFFFF)
        grid_shape = ToroidalGrid(GRID_SIZE, GRID_SIZE)
        grid = grid_shape.seed_random(num_states, rng)
        for _ in range(GENERATIONS):
            grid = step(grid, num_states, table)

        output_path = output_dir / f"rule_preview_{code}.png"
        render_grid(grid, num_states, f"{code} (gen {GENERATIONS})", output_path)
        print(f"Saved {output_path}")


if __name__ == "__main__":
    main()
