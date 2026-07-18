"""Search for 'goldilocks' outer-totalistic rules on the Kisrhombille lattice:
neither frozen/dead nor pure chaotic noise, i.e. plausible "edge of chaos"
rules likely to render as visually rich, structured tilings rather than
static blanks or TV-static chaos.

This is exploratory heuristic tooling, not a rigorously validated
classifier: it scores a rule's trajectory from a random initial condition by
(a) how much activity remains once it has had time to settle, and (b) how
much state diversity survives in the final generation (a rule that collapses
to one flat color is visually uninteresting no matter how it got there).
Candidates are printed with their scores and rule codes for manual visual
vetting (see `experiments/render_rule_preview.py`) before promoting any to
`web/js/presets.js`.

Run: `python experiments/goldilocks_rule_search.py`
Run (16-neighbor "edge+vertex" mode): `python experiments/goldilocks_rule_search.py --num-neighbors 16`
"""

from __future__ import annotations

import argparse
import random
import time

from tiling_patterns.outer_totalistic import (
    DEFAULT_NUM_NEIGHBORS,
    Grid,
    RuleTable,
    ToroidalGrid,
    activity_fraction,
    encode_rule,
    random_table,
    state_entropy,
    step,
)

GRID_SIZE = 40
GENERATIONS = 60
TRIALS_PER_STATE_COUNT = 500
BURN_IN_FRACTION = 0.5  # score over the trailing half of the run, after transients settle

FROZEN_MAX_ACTIVITY = 0.001  # at/below this trailing activity, the rule is dead-static
CHAOTIC_MIN_ACTIVITY = 0.35  # at/above this trailing activity, the rule likely looks like noise
FLAT_MAX_ENTROPY = 0.25  # at/below this final-state entropy, the rule collapsed to ~one color


def run_rule(num_states: int, table: RuleTable, num_neighbors: int, rng: random.Random) -> tuple[list[float], Grid]:
    grid_shape = ToroidalGrid(GRID_SIZE, GRID_SIZE)
    grid = grid_shape.seed_random(num_states, rng)
    activities = []
    for _ in range(GENERATIONS):
        next_grid = step(grid, num_states, table, num_neighbors)
        activities.append(activity_fraction(grid, next_grid))
        grid = next_grid
    return activities, grid


def goldilocks_score(mean_tail_activity: float, final_entropy: float) -> float:
    """Heuristic in `[-1, 1]`; higher is more promising. Negative scores mark
    rules judged dead, frozen-flat, or chaotic and not worth a visual check."""
    if final_entropy <= FLAT_MAX_ENTROPY:
        return -1.0
    if mean_tail_activity <= FROZEN_MAX_ACTIVITY:
        return -1.0
    if mean_tail_activity >= CHAOTIC_MIN_ACTIVITY:
        return -1.0
    # Reward low-but-nonzero trailing activity (settling into structure, not
    # dead) together with high final-state diversity (visually rich).
    activity_term = 1.0 - (mean_tail_activity / CHAOTIC_MIN_ACTIVITY)
    return 0.5 * activity_term + 0.5 * final_entropy


def search(num_states: int, num_neighbors: int, trials: int, base_seed: int) -> list[tuple[float, str, float, float]]:
    results = []
    for trial in range(trials):
        seed = base_seed * 1_000_003 + trial
        table = random_table(num_states, random.Random(seed), num_neighbors)
        activities, final_grid = run_rule(num_states, table, num_neighbors, random.Random(seed + 1))
        tail = activities[int(GENERATIONS * BURN_IN_FRACTION) :]
        mean_tail_activity = sum(tail) / len(tail)
        final_entropy = state_entropy(final_grid, num_states)
        score = goldilocks_score(mean_tail_activity, final_entropy)
        code = encode_rule(num_states, table, num_neighbors)
        results.append((score, code, mean_tail_activity, final_entropy))
    results.sort(key=lambda entry: entry[0], reverse=True)
    return results


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--num-neighbors", type=int, default=DEFAULT_NUM_NEIGHBORS, choices=(3, 16))
    parser.add_argument("--states", type=int, nargs="+", default=[2, 3, 4, 5])
    parser.add_argument("--trials", type=int, default=TRIALS_PER_STATE_COUNT)
    args = parser.parse_args()

    for num_states in args.states:
        started = time.perf_counter()
        results = search(num_states, args.num_neighbors, trials=args.trials, base_seed=num_states)
        elapsed = time.perf_counter() - started
        promising = [r for r in results if r[0] > 0]
        print(f"=== {num_states}-state, {args.num_neighbors}-neighbor rules: {len(promising)}/{args.trials} promising ({elapsed:.1f}s) ===")
        for score, code, activity, entropy in results[:10]:
            print(f"  score={score:+.3f} tail_activity={activity:.3f} final_entropy={entropy:.3f} code={code}")
        print()


if __name__ == "__main__":
    main()
