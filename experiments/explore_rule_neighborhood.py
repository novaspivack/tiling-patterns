"""Explore the rule-table neighborhood around a known-good rule, and search
more broadly for rules in the same *dynamical class*.

`analyze_rule.py` on `K3R8045469900` showed it does not freeze the way the
original `goldilocks_rule_search.py` candidates were selected to (that
search explicitly rewarded near-zero trailing activity — a static settled
picture). Instead it reaches a **dynamic equilibrium**: activity and entropy
both converge to a stable, nonzero plateau (~0.20-0.25 activity, ~0.45-0.48
entropy) and keep gently churning forever — small rosette clusters drifting
in a calm background, never freezing solid. That is a materially different,
and for a *live, running* demo arguably more interesting, goldilocks
criterion than "settles into a static image." This script scores rules by
that "living equilibrium" criterion instead, and searches two ways:

1. **Local neighborhood** — mutate 1-2 entries of the base rule's table and
   rescore, to see how large/robust this rule's "good" region is.
2. **Broad random search** — independently sample random rules and rescore
   with the same criterion, to see how common this dynamical class is.

Run: `python experiments/explore_rule_neighborhood.py K3R8045469900`
"""

from __future__ import annotations

import random
import statistics
import sys

from tiling_patterns.outer_totalistic import (
    Grid,
    RuleTable,
    ToroidalGrid,
    activity_fraction,
    decode_rule,
    encode_rule,
    random_table,
    state_entropy,
    step,
    table_size,
)

GRID_SIZE = 40
GENERATIONS = 100
TAIL_WINDOW = 30  # score based on the trailing window, after transients settle

TARGET_ACTIVITY_LOW = 0.04
TARGET_ACTIVITY_HIGH = 0.4
MAX_ACTIVITY_STD = 0.08  # how much the tail is allowed to wobble and still count as "converged"
MIN_ENTROPY = 0.25


def run_trajectory(num_states: int, table: RuleTable, seed: int) -> tuple[list[float], Grid]:
    rng = random.Random(seed)
    grid_shape = ToroidalGrid(GRID_SIZE, GRID_SIZE)
    grid = grid_shape.seed_random(num_states, rng)
    activities = []
    for _ in range(GENERATIONS):
        next_grid = step(grid, num_states, table)
        activities.append(activity_fraction(grid, next_grid))
        grid = next_grid
    return activities, grid


def living_equilibrium_score(num_states: int, table: RuleTable, seed: int) -> tuple[float, float, float]:
    """`(score, mean_tail_activity, final_entropy)`; higher score is better,
    negative means "not this class of rule" (frozen, still trending, chaotic, or flat)."""
    activities, final_grid = run_trajectory(num_states, table, seed)
    tail = activities[-TAIL_WINDOW:]
    mean_tail_activity = statistics.mean(tail)
    tail_std = statistics.pstdev(tail)
    final_entropy = state_entropy(final_grid, num_states)

    if not (TARGET_ACTIVITY_LOW <= mean_tail_activity <= TARGET_ACTIVITY_HIGH):
        return -1.0, mean_tail_activity, final_entropy
    if tail_std > MAX_ACTIVITY_STD:
        return -1.0, mean_tail_activity, final_entropy  # still trending/drifting, not a settled equilibrium
    if final_entropy < MIN_ENTROPY:
        return -1.0, mean_tail_activity, final_entropy

    stability_term = 1.0 - tail_std / MAX_ACTIVITY_STD
    return 0.5 * stability_term + 0.5 * final_entropy, mean_tail_activity, final_entropy


def mutate(table: RuleTable, num_states: int, num_mutations: int, rng: random.Random) -> RuleTable:
    mutated = table.copy()
    positions = rng.sample(range(len(table)), k=num_mutations)
    for position in positions:
        mutated[position] = rng.randrange(num_states)
    return mutated


def explore_neighborhood(num_states: int, base_table: RuleTable, num_mutations: int, trials: int, base_seed: int) -> list[tuple[float, str, float, float]]:
    results = []
    for trial in range(trials):
        rng = random.Random(base_seed * 7919 + trial)
        candidate = mutate(base_table, num_states, num_mutations, rng)
        score, activity, entropy = living_equilibrium_score(num_states, candidate, seed=base_seed * 7919 + trial + 1)
        results.append((score, encode_rule(num_states, candidate), activity, entropy))
    results.sort(key=lambda entry: entry[0], reverse=True)
    return results


def broad_search(num_states: int, trials: int, base_seed: int) -> list[tuple[float, str, float, float]]:
    results = []
    for trial in range(trials):
        seed = base_seed * 104_723 + trial
        candidate = random_table(num_states, random.Random(seed))
        score, activity, entropy = living_equilibrium_score(num_states, candidate, seed=seed + 1)
        results.append((score, encode_rule(num_states, candidate), activity, entropy))
    results.sort(key=lambda entry: entry[0], reverse=True)
    return results


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: python experiments/explore_rule_neighborhood.py <ruleCode>")
    base_code = sys.argv[1]
    num_states, base_table = decode_rule(base_code)
    size = table_size(num_states)

    base_score, base_activity, base_entropy = living_equilibrium_score(num_states, base_table, seed=1)
    print(f"Base rule {base_code}: score={base_score:+.3f} tail_activity={base_activity:.3f} final_entropy={base_entropy:.3f}\n")

    for num_mutations in (1, 2):
        trials = 300
        results = explore_neighborhood(num_states, base_table, num_mutations, trials, base_seed=num_mutations)
        promising = [r for r in results if r[0] > 0]
        print(f"=== {num_mutations}-entry mutations of the base table ({size} entries total): {len(promising)}/{trials} still in the same 'living equilibrium' class ===")
        for score, code, activity, entropy in results[:6]:
            print(f"  score={score:+.3f} tail_activity={activity:.3f} final_entropy={entropy:.3f} code={code}")
        print()

    trials = 800
    results = broad_search(num_states, trials, base_seed=1)
    promising = [r for r in results if r[0] > 0]
    print(f"=== broad random {num_states}-state search (independent of the base rule): {len(promising)}/{trials} in this class ===")
    for score, code, activity, entropy in results[:10]:
        print(f"  score={score:+.3f} tail_activity={activity:.3f} final_entropy={entropy:.3f} code={code}")


if __name__ == "__main__":
    main()
