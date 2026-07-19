"""Qualitative tuning sweep for the Kisrhombille CA rule's subdivide/merge and
color-competition thresholds, run before porting the rule to GLSL.

Runs `tiling_patterns.ca_rule.step` for many generations under a few
parameter combinations and reports the resulting level/color distribution,
so degenerate outcomes (everything saturates to `max_level`, or the grid
never subdivides at all) are visible in seconds rather than discovered after
writing a shader. See `RuleParams`'s docstring for the conclusion this sweep
led to.

Run: `python experiments/ca_rule_parameter_sweep.py`
"""

from __future__ import annotations

import random
from collections import Counter

from tiling_patterns.ca_rule import RuleParams, max_neighbor_level_gap, seed_grid, step
from tiling_patterns.geometry import HexCoord

EDGE_LENGTH = 1.0
GRID_RADIUS = 4
GENERATIONS = 40
REPORT_EVERY = 8


def hexes_in_radius(radius: int) -> list[HexCoord]:
    coords = []
    for q in range(-radius, radius + 1):
        for r in range(max(-radius, -q - radius), min(radius, -q + radius) + 1):
            coords.append(HexCoord(q, r))
    return coords


def run_trial(label: str, params: RuleParams, seed: int = 42) -> None:
    print(f"{label}: {params}")
    hex_coords = hexes_in_radius(GRID_RADIUS)
    grid = seed_grid(hex_coords, random.Random(seed), palette_size=params.palette_size)
    for generation in range(GENERATIONS):
        grid = step(grid, params, EDGE_LENGTH)
        if generation % REPORT_EVERY == 0 or generation == GENERATIONS - 1:
            levels = dict(sorted(Counter(state.level for state in grid.values()).items()))
            colors = dict(sorted(Counter(state.color_class for state in grid.values()).items()))
            gap = max_neighbor_level_gap(grid, EDGE_LENGTH)
            print(f"  gen={generation:3d} levels={levels} colors={colors} max_neighbor_gap={gap}")
    print()


def main() -> None:
    run_trial(
        "degenerate: 1-of-3 consensus never lets the grid quiet down",
        RuleParams(advance_neighbor_threshold=1, subdivide_activity_threshold=2, merge_activity_threshold=1, merge_patience=3),
    )
    run_trial("tuned default (adopted in RuleParams)", RuleParams())
    run_trial(
        "tuned, longer merge patience",
        RuleParams(advance_neighbor_threshold=2, subdivide_activity_threshold=2, merge_activity_threshold=0, merge_patience=6),
    )


if __name__ == "__main__":
    main()
