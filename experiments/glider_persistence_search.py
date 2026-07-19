"""Diagnose and search for genuinely persistent, translating "gliders" —
small, localized structures that survive and move for many generations in
total isolation (an otherwise all-zero grid) — as opposed to the small
coherent-looking structures already found by `goldilocks_rule_search.py`.

That search only ever scores a rule by its *aggregate* activity/entropy from
a busy, randomly-seeded field. A "glider" glimpsed there for a few frames is
not validated to be a locally stable, self-sustaining structure at all — it
may simply be an artifact of the surrounding chaotic field constantly
feeding it, or a coincidental transient that happens to look coherent for a
moment before dispersing. This script isolates that question: seed a small
perturbation on an otherwise quiet background, remove every other cell that
could interact with it, and measure directly how long the perturbation
survives and how far it travels before dying out or exploding into
unbounded growth.

Two things this script does:

1. `--diagnose`: run every rule code passed on the command line (or a
   built-in list of this project's "glider"-labeled presets) against a
   handful of small seed shapes, in isolation, and report exactly how many
   generations each seed survives and how far it moved. This directly
   answers "why do the existing gliders puff out after a few generations" —
   if a small isolated seed dies immediately under a rule, that rule simply
   does not support a stable local structure at all (with that seed shape),
   regardless of how lively it looks in a busy field.
2. `--search`: run the same isolated-seed persistence test as a fitness
   function over many random candidate rules, looking for ones where a
   small asymmetric seed survives for a long time, stays bounded (does not
   explode into filling the whole grid), and travels a real net distance
   (indicating directed translation, not a static blinker or a symmetric
   expanding/contracting blob).

Run: `python experiments/glider_persistence_search.py --diagnose`
Run: `python experiments/glider_persistence_search.py --search --states 2 --trials 2000`
"""

from __future__ import annotations

import argparse
import random
import time
from dataclasses import dataclass

import numpy as np

from tiling_patterns.geometry import CellAddress, HexCoord, cell_centroid
from tiling_patterns.lattice import NUM_SECTORS
from tiling_patterns.outer_totalistic import (
    Grid,
    RuleTable,
    decode_rule,
    encode_rule,
    random_table,
    step,
)

EDGE_LENGTH = 1.0
GRID_SIZE = 81  # odd, so there is an exact center hex; big enough that a
# translating structure at a plausible speed (a few hexes per generation at
# most) cannot wrap around the torus and self-interact within MAX_GENERATIONS.
CENTER = GRID_SIZE // 2
MAX_GENERATIONS = 200
EXPLODE_CAP = 150  # more active cells than this -> unbounded growth, not a localized glider

# This project's existing "glider"-labeled presets (`web/js/presets.js`), for
# --diagnose's default target list.
GLIDER_PRESET_CODES = {
    "Glider Waves (3, default)": "K2N16R205320",
    "Glider Fronts (sparser)": "K2N16R207368",
    "Glider Waves": "K2N16R211464",
    "Glider Waves (variant)": "K2N16R211336",
    "Glider Fronts": "K2N16R210440",
    "Glider Fans": "K2N16R16852987912",
}


def _empty_grid() -> Grid:
    return np.zeros((GRID_SIZE, GRID_SIZE, NUM_SECTORS), dtype=np.uint8)


# --- seed shapes -------------------------------------------------------------
# A rule can only ever produce *directed* translation from a seed that itself
# has no symmetry forcing it to stay put (a fully symmetric seed can at most
# pulse, oscillate in place, or expand/contract symmetrically -- it has no
# way to "choose" a direction). single_sector/single_hex are included as a
# baseline (they are the simplest possible perturbations, but are themselves
# nearly symmetric); the asymmetric seeds are the ones actually likely to
# reveal directed motion.


def seed_single_sector(num_states: int, rng: random.Random) -> Grid:
    grid = _empty_grid()
    grid[CENTER, CENTER, 0] = rng.randrange(1, num_states)
    return grid


def seed_single_hex(num_states: int, rng: random.Random) -> Grid:
    grid = _empty_grid()
    grid[CENTER, CENTER, :] = rng.randrange(1, num_states)
    return grid


def seed_asymmetric_small(num_states: int, rng: random.Random) -> Grid:
    """5 nonzero cells spread across the center hex and 2 of its neighbors,
    in a deliberately lopsided arrangement (no rotational or reflective
    symmetry) -- the CA analog of Conway's Game of Life's 5-cell glider
    shape, adapted to this lattice's 12-sector hexes."""
    grid = _empty_grid()
    grid[CENTER, CENTER, 0] = rng.randrange(1, num_states)
    grid[CENTER, CENTER, 1] = rng.randrange(1, num_states)
    grid[CENTER, CENTER, 6] = rng.randrange(1, num_states)
    grid[CENTER, CENTER + 1, 3] = rng.randrange(1, num_states)
    grid[CENTER + 1, CENTER, 10] = rng.randrange(1, num_states)
    return grid


def seed_asymmetric_random(num_states: int, rng: random.Random, num_cells: int = 6) -> Grid:
    """`num_cells` nonzero cells at random sectors within the center hex and
    its 6 immediate neighbors -- a broader, less hand-designed asymmetric
    seed than `seed_asymmetric_small`, for sampling many candidate shapes
    during a search rather than relying on one fixed guess."""
    grid = _empty_grid()
    hex_offsets = [(0, 0), (1, 0), (0, 1), (-1, 0), (0, -1), (1, -1), (-1, 1)]
    for _ in range(num_cells):
        dq, dr = hex_offsets[rng.randrange(len(hex_offsets))]
        sector = rng.randrange(NUM_SECTORS)
        grid[CENTER + dr, CENTER + dq, sector] = rng.randrange(1, num_states)
    return grid


SEED_SHAPES = {
    "single_sector": seed_single_sector,
    "single_hex": seed_single_hex,
    "asymmetric_5": seed_asymmetric_small,
}


# --- running + measuring one isolated trial ---------------------------------


@dataclass
class IsolatedRunResult:
    active_counts: list[int]
    centroids: list[tuple[float, float]]
    died_at: int | None
    exploded_at: int | None


def _active_centroid(active_mask: np.ndarray) -> tuple[float, float]:
    rs, qs, sectors = np.nonzero(active_mask)
    xs = np.empty(len(rs))
    ys = np.empty(len(rs))
    for i, (r, q, sector) in enumerate(zip(rs, qs, sectors)):
        address = CellAddress(HexCoord(int(q) - CENTER, int(r) - CENTER), int(sector))
        xs[i], ys[i] = cell_centroid(address, EDGE_LENGTH)
    return (float(xs.mean()), float(ys.mean()))


def run_isolated(
    num_states: int, table: RuleTable, num_neighbors: int, seed_grid: Grid, max_generations: int = MAX_GENERATIONS
) -> IsolatedRunResult:
    grid = seed_grid
    active_counts: list[int] = []
    centroids: list[tuple[float, float]] = []
    died_at: int | None = None
    exploded_at: int | None = None
    for generation in range(max_generations):
        active_mask = grid != 0
        active_count = int(active_mask.sum())
        active_counts.append(active_count)
        if active_count == 0:
            died_at = generation
            break
        if active_count > EXPLODE_CAP:
            exploded_at = generation
            break
        centroids.append(_active_centroid(active_mask))
        grid = step(grid, num_states, table, num_neighbors)
    return IsolatedRunResult(active_counts, centroids, died_at, exploded_at)


_POSITION_ROUND_DECIMALS = 3
# A period-N blinker/oscillator (a structure that toggles between a small,
# fixed set of positions forever -- itself a legitimate but non-glider
# outcome) can only ever revisit this many *distinct* rounded positions
# across an arbitrarily long observation window. Any genuinely translating
# structure sampled over many generations will visit far more distinct
# positions than this, since it keeps moving to new ground rather than
# cycling through the same few spots -- this is what actually distinguishes
# "moving" from "oscillating in place with some spatial amplitude" (which a
# naive two-point displacement check, comparing only e.g. the midpoint to
# the final generation, cannot tell apart: a period-2 blinker sampled at two
# arbitrary points has a nonzero "displacement" between them despite never
# going anywhere new).
MAX_OSCILLATOR_DISTINCT_POSITIONS = 8


def summarize(result: IsolatedRunResult) -> dict:
    if result.died_at is not None:
        survived = result.died_at
    elif result.exploded_at is not None:
        survived = result.exploded_at
    else:
        survived = len(result.active_counts)
    net_displacement = 0.0
    if len(result.centroids) >= 2:
        (x0, y0), (x1, y1) = result.centroids[0], result.centroids[-1]
        net_displacement = float(np.hypot(x1 - x0, y1 - y0))
    mean_speed = net_displacement / max(1, len(result.centroids) - 1)

    # A structure that shuffles once early on and then either freezes solid
    # or settles into a small-period blinker (both of which only ever
    # revisit a handful of distinct positions, no matter how long the run
    # continues) is not a glider, no matter how large its net displacement
    # from generation 0 is or how far apart any two arbitrarily chosen late
    # samples happen to be. Confined to the *second half* of the run, so an
    # initial settling transient never counts as "still moving."
    half = len(result.centroids) // 2
    late_positions = result.centroids[half:]
    distinct_late_positions = len({(round(x, _POSITION_ROUND_DECIMALS), round(y, _POSITION_ROUND_DECIMALS)) for x, y in late_positions})
    is_oscillator_or_frozen = distinct_late_positions <= MAX_OSCILLATOR_DISTINCT_POSITIONS
    late_displacement = 0.0
    if len(late_positions) >= 2 and not is_oscillator_or_frozen:
        (xh, yh), (xl, yl) = late_positions[0], late_positions[-1]
        late_displacement = float(np.hypot(xl - xh, yl - yh))

    # A structure whose active-cell count is *still climbing* near the end
    # of the recorded window has not been shown to be stably bounded at
    # all -- it simply has not yet grown past `EXPLODE_CAP` within however
    # many generations this particular run happened to last. Comparing the
    # mean active count of the third quarter against the last quarter
    # catches this even when the run ends (died/exploded/hit
    # max_generations) before the count actually crosses the cap -- this is
    # what separates a genuinely size-stable glider from a slow-growing
    # pattern that a short observation window simply caught too early.
    quarter = max(1, len(result.active_counts) // 4)
    has_enough_for_trend = len(result.active_counts) > 3 * quarter  # strictly more, so the last-quarter slice below is non-empty
    third_quarter_mean = float(np.mean(result.active_counts[2 * quarter : 3 * quarter])) if has_enough_for_trend else None
    last_quarter_mean = float(np.mean(result.active_counts[3 * quarter :])) if has_enough_for_trend else None
    still_growing = third_quarter_mean is not None and last_quarter_mean is not None and last_quarter_mean > third_quarter_mean + 2.0

    # "Wandering" (many distinct late positions, no freeze) is necessary but
    # not sufficient for a glider: a structure can wander indefinitely while
    # staying confined to a small local neighborhood forever (a "wobbler" --
    # itself a genuine, interesting, non-trivial long-lived structure, but
    # not a spaceship that makes unbounded net progress across the grid).
    # Distinguish the two by the running maximum distance from the starting
    # position: a real glider keeps setting new distance records right up
    # to the end of the window; a wobbler's running maximum plateaus early
    # and stays flat no matter how long the run continues.
    is_translating = False
    if result.centroids and not is_oscillator_or_frozen:
        x0, y0 = result.centroids[0]
        distances_from_start = [float(np.hypot(x - x0, y - y0)) for x, y in result.centroids]
        running_max = np.maximum.accumulate(distances_from_start)
        if len(running_max) > 3 * quarter:
            is_translating = bool(running_max[-1] > running_max[2 * quarter] + 2 * EDGE_LENGTH)

    return {
        "survived_generations": survived,
        "died": result.died_at is not None,
        "exploded": result.exploded_at is not None,
        "max_active": max(result.active_counts) if result.active_counts else 0,
        "final_active": result.active_counts[-1] if result.active_counts else 0,
        "net_displacement": net_displacement,
        "mean_speed": mean_speed,
        "distinct_late_positions": distinct_late_positions,
        "is_oscillator_or_frozen": is_oscillator_or_frozen,
        "late_displacement": late_displacement,
        "still_growing": still_growing,
        "is_translating": is_translating,
    }


# --- glider fitness: is this a real, long-lived, translating structure? -----


def glider_fitness(summary: dict) -> float:
    """Heuristic in `[0, 1]`; higher is a more convincing long-lived,
    *translating* glider (as opposed to a still life, a small-period
    blinker/oscillator, an unboundedly growing pattern, or a "wobbler" that
    wanders indefinitely but stays confined to a small local neighborhood
    forever -- see `is_translating`'s docstring above `summarize`, which is
    the one check here that actually rules out wobblers). All 3 of
    `is_oscillator_or_frozen`, `still_growing`, and *not* `is_translating`
    are independently disqualifying, regardless of how good any other
    number in the summary looks."""
    if summary["is_oscillator_or_frozen"] or summary["still_growing"] or not summary["is_translating"]:
        return 0.0
    if summary["died"] or summary["exploded"]:
        survival_term = summary["survived_generations"] / MAX_GENERATIONS
    else:
        survival_term = 1.0
    # A glider needs to have traveled at least a couple of hex-widths net,
    # *during the second half of the run alone*, to count as ongoing
    # directed motion rather than jitter; cap the reward so a very fast,
    # short-lived streak cannot outscore genuine sustained persistence.
    speed_term = min(1.0, summary["late_displacement"] / (2 * EDGE_LENGTH))
    return survival_term * (0.4 + 0.6 * speed_term)


# --- diagnose: test this project's existing "glider" presets in isolation --


def diagnose(codes: dict[str, str], seed_trials_per_shape: int, base_seed: int) -> None:
    if seed_trials_per_shape < 1:
        raise ValueError("seed_trials_per_shape must be at least 1")
    for name, code in codes.items():
        num_states, num_neighbors, table = decode_rule(code)
        print(f"=== {name} ({code}) ===")
        for shape_name, shape_fn in SEED_SHAPES.items():
            best: dict | None = None
            for trial in range(seed_trials_per_shape):
                rng = random.Random(base_seed * 7919 + hash((shape_name, trial)) % 1_000_003)
                seed_grid = shape_fn(num_states, rng)
                result = run_isolated(num_states, table, num_neighbors, seed_grid)
                summary = summarize(result)
                if best is None or summary["survived_generations"] > best["survived_generations"]:
                    best = summary
            assert best is not None  # guaranteed by the `seed_trials_per_shape >= 1` check above
            outcome = "exploded" if best["exploded"] else ("died" if best["died"] else "survived full run")
            if best["is_oscillator_or_frozen"]:
                category = "osc/frozen"
            elif best["still_growing"]:
                category = "still-growing"
            elif best["is_translating"]:
                category = "TRANSLATING"
            else:
                category = "wobbler (bounded)"
            print(
                f"  {shape_name:16s} best-of-{seed_trials_per_shape}: {outcome} at gen {best['survived_generations']:4d}"
                f" | max_active={best['max_active']:4d} | {category} ({best['distinct_late_positions']} distinct late positions)"
                f" | late_displacement={best['late_displacement']:.2f} | fitness={glider_fitness(best):.3f}"
            )
        print()


# --- search: look for a genuinely better glider rule ------------------------


def search(num_states: int, num_neighbors: int, trials: int, base_seed: int) -> list[tuple[float, str, dict]]:
    results = []
    for trial in range(trials):
        seed = base_seed * 1_000_003 + trial
        rng = random.Random(seed)
        table = random_table(num_states, rng, num_neighbors)
        best_summary: dict | None = None
        for shape_fn in (seed_asymmetric_small, seed_asymmetric_random):
            seed_grid = shape_fn(num_states, random.Random(seed + 1))
            result = run_isolated(num_states, table, num_neighbors, seed_grid)
            summary = summarize(result)
            if best_summary is None or glider_fitness(summary) > glider_fitness(best_summary):
                best_summary = summary
        assert best_summary is not None  # the shape_fn tuple above is a fixed nonempty literal
        code = encode_rule(num_states, table, num_neighbors)
        results.append((glider_fitness(best_summary), code, best_summary))
    results.sort(key=lambda entry: entry[0], reverse=True)
    return results


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--diagnose", action="store_true", help="test this project's existing glider presets in isolation")
    parser.add_argument("--search", action="store_true", help="search random rules for a longer-lived, translating structure")
    parser.add_argument("--codes", nargs="+", default=None, help="rule codes to diagnose instead of the built-in glider preset list")
    parser.add_argument("--num-neighbors", type=int, default=16, choices=(3, 16))
    parser.add_argument("--states", type=int, nargs="+", default=[2])
    parser.add_argument("--trials", type=int, default=2000)
    parser.add_argument("--seed-trials-per-shape", type=int, default=8)
    args = parser.parse_args()

    if not args.diagnose and not args.search:
        args.diagnose = True

    if args.diagnose:
        codes = {code: code for code in args.codes} if args.codes else GLIDER_PRESET_CODES
        diagnose(codes, args.seed_trials_per_shape, base_seed=1)

    if args.search:
        for num_states in args.states:
            started = time.perf_counter()
            results = search(num_states, args.num_neighbors, trials=args.trials, base_seed=num_states)
            elapsed = time.perf_counter() - started
            print(f"=== {num_states}-state, {args.num_neighbors}-neighbor glider search: {args.trials} trials ({elapsed:.1f}s) ===")
            for fitness, code, summary in results[:10]:
                outcome = "exploded" if summary["exploded"] else ("died" if summary["died"] else "survived full run")
                if summary["is_oscillator_or_frozen"]:
                    category = "osc/frozen"
                elif summary["still_growing"]:
                    category = "still-growing"
                elif summary["is_translating"]:
                    category = "TRANSLATING"
                else:
                    category = "wobbler (bounded)"
                print(
                    f"  fitness={fitness:.3f} {outcome} at gen {summary['survived_generations']:4d}"
                    f" | max_active={summary['max_active']:4d} | {category} ({summary['distinct_late_positions']} distinct)"
                    f" | late_displacement={summary['late_displacement']:.2f} | code={code}"
                )
            print()


if __name__ == "__main__":
    main()
