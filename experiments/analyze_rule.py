"""Structural + dynamical analysis of one outer-totalistic rule: table
breakdown (stasis / cyclic-advance / cyclic-retreat / other), an
activity-over-time trajectory, and a rendered preview — used to understand
*why* a rule found via the browser's Randomize tool or a search sweep looks
good, not just that it does.

Run: `python experiments/analyze_rule.py K3R8045469900`
"""

from __future__ import annotations

import random
import sys
from pathlib import Path

import matplotlib.pyplot as plt

from tiling_patterns.outer_totalistic import (
    ToroidalGrid,
    activity_fraction,
    decode_rule,
    max_neighbor_sum,
    state_entropy,
    step,
    table_size,
)

GRID_SIZE = 40
GENERATIONS = 150


def classify_table(num_states: int, table, num_neighbors: int) -> None:
    max_sum = max_neighbor_sum(num_states, num_neighbors)
    counts = {"stasis": 0, "advance (+1)": 0, "retreat (-1)": 0, "other": 0}
    print(f"table (rows = own_state 0..{num_states - 1}, cols = neighbor_sum 0..{max_sum}):")
    for own in range(num_states):
        row = table[own * (max_sum + 1) : (own + 1) * (max_sum + 1)]
        labels = []
        for next_state in row:
            if next_state == own:
                counts["stasis"] += 1
                labels.append("=")
            elif next_state == (own + 1) % num_states:
                counts["advance (+1)"] += 1
                labels.append("+")
            elif next_state == (own - 1) % num_states:
                counts["retreat (-1)"] += 1
                labels.append("-")
            else:
                counts["other"] += 1
                labels.append("?")
        print(f"  own={own}: next={list(row)}  ({' '.join(labels)})")
    total = table_size(num_states, num_neighbors)
    print("\nTransition class breakdown (of all table entries, not weighted by how often each is hit):")
    for label, count in counts.items():
        print(f"  {label:14s} {count:3d} / {total} ({100 * count / total:.0f}%)")


def run_trajectory(num_states: int, table, num_neighbors: int, seed: int) -> tuple[list[float], list[float]]:
    rng = random.Random(seed)
    grid_shape = ToroidalGrid(GRID_SIZE, GRID_SIZE)
    grid = grid_shape.seed_random(num_states, rng)
    activities = []
    entropies = [state_entropy(grid, num_states)]
    for _ in range(GENERATIONS):
        next_grid = step(grid, num_states, table, num_neighbors)
        activities.append(activity_fraction(grid, next_grid))
        grid = next_grid
        entropies.append(state_entropy(grid, num_states))
    return activities, entropies


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: python experiments/analyze_rule.py <ruleCode>")
    code = sys.argv[1]
    num_states, num_neighbors, table = decode_rule(code)

    print(f"=== {code} ===")
    classify_table(num_states, table, num_neighbors)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)

    fig, (ax_activity, ax_entropy) = plt.subplots(2, 1, figsize=(8, 6), sharex=True)
    for seed in range(5):
        activities, entropies = run_trajectory(num_states, table, num_neighbors, seed)
        ax_activity.plot(activities, alpha=0.8, label=f"seed {seed}")
        ax_entropy.plot(entropies, alpha=0.8, label=f"seed {seed}")
    ax_activity.set_ylabel("activity fraction")
    ax_activity.set_title(f"{code} — activity and state-entropy over {GENERATIONS} generations (5 random seeds)")
    ax_activity.legend(fontsize=8)
    ax_entropy.set_ylabel("state entropy (normalized)")
    ax_entropy.set_xlabel("generation")
    fig.tight_layout()
    trajectory_path = output_dir / f"analyze_{code}_trajectory.png"
    fig.savefig(trajectory_path, dpi=150)
    plt.close(fig)
    print(f"\nSaved {trajectory_path}")


if __name__ == "__main__":
    main()
