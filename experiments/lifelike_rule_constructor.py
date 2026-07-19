"""Principled construction of candidate "life-like" rules on the Kisrhombille
lattice, instead of relying purely on random search.

Conway's Game of Life (and its many known relatives -- HighLife, Day & Night,
Morley, 2x2, Assimilation, Diamoeba, Seeds, etc.) are all "outer-totalistic
B/S" rules on an 8-neighbor Moore grid: a dead cell is born only for a narrow
set of neighbor counts (`B`), a live cell survives only for a narrow set of
neighbor counts (`S`), and dies (or, in the 3-state generalization below,
decays to a refractory state first) otherwise. That narrow-birth /
narrow-survival structure -- not any particular numeric threshold -- is the
qualitative feature believed to matter for supporting complex, bounded,
non-degenerate dynamics (including gliders): permissive-everywhere birth
conditions explode into unbounded growth, and birth/survival conditions
requiring either very few or very many neighbors tend to die out or freeze,
so interesting behavior clusters in a narrow "just enough, not too much"
band, matching how this project's own `goldilocks_rule_search.py` frames
things empirically.

This script makes that structure explicit and constructs candidates two
ways, rather than leaving it to chance in a fully random table search:

1. Take several well-studied Life-like `B`/`S` rule strings from the 8-
   neighbor Moore-grid literature and rescale their birth/survival neighbor
   counts proportionally to this lattice's actual neighbor counts (3 or 16)
   -- e.g. Life's B3/S23 (3/8, 2/8-3/8 of max) becomes B6/S4-6 at 16
   neighbors. This is *not* a claim that the rescaled rule behaves like
   Life on this very different lattice geometry -- only that it preserves
   the qualitative "narrow birth, narrow-and-nearby survival" shape that is
   necessary (not sufficient) for life-like complexity.
2. Sweep a local neighborhood of birth/survival windows around each
   rescaled candidate (the lattice's very different local geometry and
   summed-non-boolean-outer-totalistic structure means the *exact* rescaled
   thresholds are unlikely to be the best fit even where the general
   "narrow band" shape is right).

For 3-state rules, each 2-state B/S candidate is also turned into an
"aging" generalization (common in the wider CA literature, e.g. Generations
rulesets): dead (0) -> alive (1) on the birth set; alive (1) -> alive (1) on
the survival set, else -> refractory (2); refractory (2) -> dead (0)
unconditionally. The refractory state is a short-term "memory" that a cell
was recently alive, which sometimes supports cleaner traveling structures
than plain 2-state Life-like rules by preventing an about-to-die cell from
being immediately reborn in place.

Every constructed candidate is filtered by (a) a quick busy-field activity
check (reusing this project's existing intuition: dead/frozen and
maximally-chaotic/exploding candidates are not interesting) and (b) the
isolated-seed persistence test from `glider_persistence_search.py` (does a
small perturbation survive, stay bounded, and -- the one property this
project has not yet found in ~23,000 random-rule trials -- actually
translate). Only rule codes are printed, ready to paste into the app's
"Apply code" field; visual vetting is left to the user rather than this
script guessing at what looks good.

Run: `python experiments/lifelike_rule_constructor.py`
Run (3-neighbor mode too): `python experiments/lifelike_rule_constructor.py --num-neighbors 3 16`
"""

from __future__ import annotations

import argparse
import random
import sys
from dataclasses import dataclass

import numpy as np

sys.path.insert(0, "experiments")

from glider_persistence_search import (  # noqa: E402
    seed_asymmetric_random,
    seed_asymmetric_small,
    run_isolated,
    summarize,
)
from tiling_patterns.outer_totalistic import (  # noqa: E402
    RuleTable,
    activity_fraction,
    encode_rule,
    max_neighbor_sum,
    state_entropy,
    step,
)

FROZEN_MAX_ACTIVITY = 0.001
CHAOTIC_MIN_ACTIVITY = 0.45

# Well-studied Life-like B/S rules on the 8-neighbor Moore grid (name: (birth
# set, survival set)), used as the qualitative templates to rescale from.
# Sourced from the standard "Life-like cellular automaton" literature
# (LifeWiki's rules list) -- these are simply well-known reference points,
# not claims about this lattice.
MOORE_NEIGHBORS = 8
LIFE_LIKE_TEMPLATES: dict[str, tuple[frozenset[int], frozenset[int]]] = {
    "life": (frozenset({3}), frozenset({2, 3})),
    "highlife": (frozenset({3, 6}), frozenset({2, 3})),
    "day_and_night": (frozenset({3, 6, 7, 8}), frozenset({3, 4, 6, 7, 8})),
    "seeds": (frozenset({2}), frozenset()),
    "2x2": (frozenset({3, 6}), frozenset({1, 2, 5})),
    "morley": (frozenset({3, 6, 8}), frozenset({2, 4, 5})),
    "assimilation": (frozenset({3, 4, 5}), frozenset({4, 5, 6, 7})),
    "diamoeba": (frozenset({3, 5, 6, 7, 8}), frozenset({5, 6, 7, 8})),
    "life_without_death": (frozenset({3}), frozenset(range(9))),
}


def _rescale_set(values: frozenset[int], from_max: int, to_max: int) -> frozenset[int]:
    """Rescale a set of neighbor-count thresholds from one max neighbor
    count to another, preserving contiguous runs as contiguous ranges.
    Naively rounding each element independently can open gaps in what was a
    contiguous run -- e.g. Life's survival set {2, 3} is 1 contiguous run
    covering fractions [0.25, 0.375] of 8; rounding each element separately
    at 16 neighbors gives {4, 6} (skipping 5, since round(0.25*16)=4 and
    round(0.375*16)=6 without anything guaranteeing the *interior* of the
    original run's fractional span maps to a contiguous target run too).
    Instead, treat every maximal contiguous run in `values` as a single
    [lo, hi] range, rescale its two endpoints, and fill in every integer
    between the rescaled endpoints."""
    if not values:
        return frozenset()
    sorted_values = sorted(values)
    runs: list[list[int]] = [[sorted_values[0]]]
    for v in sorted_values[1:]:
        if v == runs[-1][-1] + 1:
            runs[-1].append(v)
        else:
            runs.append([v])
    out: set[int] = set()
    for run in runs:
        lo = min(to_max, max(0, round(run[0] * to_max / from_max)))
        hi = min(to_max, max(0, round(run[-1] * to_max / from_max)))
        out.update(range(min(lo, hi), max(lo, hi) + 1))
    return frozenset(out)


@dataclass(frozen=True)
class BSCandidate:
    label: str
    birth: frozenset[int]
    survival: frozenset[int]


def rescaled_templates(num_neighbors: int) -> list[BSCandidate]:
    return [
        BSCandidate(name, _rescale_set(b, MOORE_NEIGHBORS, num_neighbors), _rescale_set(s, MOORE_NEIGHBORS, num_neighbors))
        for name, (b, s) in LIFE_LIKE_TEMPLATES.items()
    ]


def local_sweep(base: BSCandidate, num_neighbors: int, radius: int = 1) -> list[BSCandidate]:
    """Every candidate reachable from `base` by shifting its whole birth set
    and/or whole survival set by up to `radius` (independently), clipped to
    `[0, num_neighbors]` -- broadens each rescaled template into a small
    neighborhood of nearby narrow-band shapes, since the exact rescaled
    thresholds are a guess, not a validated optimum, on this lattice."""
    variants = []
    for db in range(-radius, radius + 1):
        for ds in range(-radius, radius + 1):
            birth = frozenset(min(num_neighbors, max(0, v + db)) for v in base.birth) or base.birth
            survival = frozenset(min(num_neighbors, max(0, v + ds)) for v in base.survival) or base.survival
            variants.append(BSCandidate(f"{base.label}(b{db:+d}s{ds:+d})", birth, survival))
    return variants


def build_binary_table(candidate: BSCandidate, num_neighbors: int) -> RuleTable:
    max_sum = max_neighbor_sum(2, num_neighbors)
    table = np.zeros(2 * (max_sum + 1), dtype=np.uint8)
    for s in candidate.birth:
        if 0 <= s <= max_sum:
            table[0 * (max_sum + 1) + s] = 1
    for s in candidate.survival:
        if 0 <= s <= max_sum:
            table[1 * (max_sum + 1) + s] = 1
    return table


def build_aging_table(candidate: BSCandidate, num_neighbors: int) -> RuleTable:
    """3-state generalization: 0 (dead) -> 1 (alive) on birth; 1 (alive) ->
    1 on survival else -> 2 (refractory); 2 (refractory) -> 0 unconditionally."""
    max_sum = max_neighbor_sum(3, num_neighbors)
    table = np.zeros(3 * (max_sum + 1), dtype=np.uint8)
    for s in candidate.birth:
        if 0 <= s <= max_sum:
            table[0 * (max_sum + 1) + s] = 1
    for s in range(max_sum + 1):
        table[1 * (max_sum + 1) + s] = 1 if s in candidate.survival else 2
    # Row 2 (refractory) is already all zeros (-> dead) from np.zeros above.
    return table


def _seed_at_density(num_states: int, shape: tuple[int, int, int], density: float, seed: int) -> np.ndarray:
    mask = np.random.RandomState(seed).random(shape) < density
    values = np.random.RandomState(seed + 1).randint(1, num_states, size=shape)
    return np.where(mask, values, 0).astype(np.uint8)


# Unlike this project's own hand-curated presets (all vetted at the app's
# default sparse 2% seed density), a narrow-birth Life-like rule generally
# *requires* a denser starting field to ever get going at all -- a birth
# threshold of, say, 6 living neighbors out of 16 is essentially unreachable
# from a 2%-density seed (expected neighbor count ~= 16 * 0.02 = 0.32), so
# checking only at 2% would misclassify every narrow-birth candidate as
# "frozen" when a denser seed might reveal real living-equilibrium behavior.
# Conway's Life itself is also commonly seeded at 30-50% density for
# interesting dynamics, not the few-percent range that works for this
# project's other (very different, already-tuned-for-sparse-seeding) rules.
CHECK_DENSITIES = (0.02, 0.15, 0.3, 0.5)


def quick_activity_check(num_states: int, table: RuleTable, num_neighbors: int, grid_size: int = 50, generations: int = 80) -> tuple[float, float, float]:
    """Busy-field activity/entropy from several seed densities, over a
    short run -- a cheap first filter before the much more expensive
    isolated-seed persistence test below. Returns the *best* (highest,
    nonzero, non-chaotic-looking) tail activity found across densities,
    the corresponding entropy, and the density that produced it, so a
    narrow-birth rule that only comes alive at 30% density is not
    mistaken for a dead one just because it looks frozen at 2%."""
    best = (0.0, 0.0, CHECK_DENSITIES[0])
    for density in CHECK_DENSITIES:
        grid = _seed_at_density(num_states, (grid_size, grid_size, 12), density, seed=hash((num_states, num_neighbors, density)) % 2**31)
        activities = []
        for _ in range(generations):
            next_grid = step(grid, num_states, table, num_neighbors)
            activities.append(activity_fraction(grid, next_grid))
            grid = next_grid
        tail_activity = float(np.mean(activities[generations // 2 :]))
        if FROZEN_MAX_ACTIVITY < tail_activity < CHAOTIC_MIN_ACTIVITY and tail_activity > best[0]:
            entropy = state_entropy(grid, num_states)
            best = (tail_activity, entropy, density)
    return best


def isolated_glider_check(num_states: int, table: RuleTable, num_neighbors: int, trials: int = 4) -> dict:
    """Best-of-`trials` isolated-seed persistence summary, reusing
    `glider_persistence_search.py`'s tooling directly rather than
    reimplementing it."""
    best = None
    for trial in range(trials):
        for shape_fn in (seed_asymmetric_small, seed_asymmetric_random):
            seed_grid = shape_fn(num_states, random.Random(trial))
            result = run_isolated(num_states, table, num_neighbors, seed_grid)
            summary = summarize(result)
            if best is None or (summary["died"], summary["exploded"]) < (best["died"], best["exploded"]):
                best = summary
    assert best is not None
    return best


@dataclass(frozen=True)
class Candidate:
    label: str
    num_states: int
    table: RuleTable
    code: str


def build_candidates(num_neighbors: int, sweep_radius: int, include_aging: bool) -> list[Candidate]:
    out = []
    seen_binary = set()
    for template in rescaled_templates(num_neighbors):
        for variant in local_sweep(template, num_neighbors, radius=sweep_radius):
            key = (variant.birth, variant.survival)
            if key in seen_binary or not variant.birth or not variant.survival:
                continue
            seen_binary.add(key)
            binary_table = build_binary_table(variant, num_neighbors)
            out.append(Candidate(variant.label, 2, binary_table, encode_rule(2, binary_table, num_neighbors)))
            if include_aging:
                aging_table = build_aging_table(variant, num_neighbors)
                out.append(Candidate(variant.label, 3, aging_table, encode_rule(3, aging_table, num_neighbors)))
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--num-neighbors", type=int, nargs="+", default=[16], choices=(3, 16))
    parser.add_argument("--sweep-radius", type=int, default=1)
    parser.add_argument("--no-aging", action="store_true", help="skip the 3-state aging/refractory generalization")
    parser.add_argument("--isolated-trials", type=int, default=4)
    parser.add_argument("--max-print", type=int, default=40)
    parser.add_argument(
        "--rank-by",
        choices=("busy-field", "isolated-persistence"),
        default="busy-field",
        help=(
            "'busy-field' (default) ranks by settled activity/entropy from the app's real sparse-random seed -- the "
            "relevant question for curating visually appealing 'goldilocks zone' presets. 'isolated-persistence' ranks "
            "by whether a small isolated seed survives -- the relevant question for glider/spaceship hunting only; "
            "these two rankings can disagree substantially (a rule can excel at one and fail the other), since a small "
            "isolated seed's fate with nothing to interact with is a different question from the whole grid's fate "
            "under constant mutual interaction from a real seed."
        ),
    )
    args = parser.parse_args()

    for num_neighbors in args.num_neighbors:
        candidates = build_candidates(num_neighbors, args.sweep_radius, include_aging=not args.no_aging)
        print(f"=== {num_neighbors}-neighbor: {len(candidates)} constructed candidates (deduplicated) ===")
        kept = []
        for candidate in candidates:
            tail_activity, entropy, density = quick_activity_check(candidate.num_states, candidate.table, num_neighbors)
            if tail_activity <= FROZEN_MAX_ACTIVITY:
                continue
            isolated = isolated_glider_check(candidate.num_states, candidate.table, num_neighbors, trials=args.isolated_trials)
            kept.append((candidate, tail_activity, entropy, density, isolated))

        if args.rank_by == "busy-field":
            kept.sort(key=lambda entry: -entry[1])
        else:
            kept.sort(key=lambda entry: (entry[4]["exploded"], entry[4]["died"], -entry[1]))
        translating = [k for k in kept if k[4].get("is_translating")]
        if translating:
            print(f"  *** {len(translating)} candidate(s) show TRUE isolated translation -- inspect these first! ***")
            for candidate, tail_activity, entropy, density, isolated in translating:
                print(f"    TRANSLATING | k={candidate.num_states} | template={candidate.label} | tail_activity={tail_activity:.3f} @density={density} | code={candidate.code}")
        print(f"  {len(kept)}/{len(candidates)} passed the busy-field activity filter (not frozen at any seed density tried); showing up to {args.max_print}:")
        for candidate, tail_activity, entropy, density, isolated in kept[: args.max_print]:
            status = "exploded" if isolated["exploded"] else ("died" if isolated["died"] else "bounded")
            print(
                f"    k={candidate.num_states} | template={candidate.label:24s} | tail_activity={tail_activity:.3f} @density={density:<4} entropy={entropy:.2f}"
                f" | isolated:{status} | code={candidate.code}"
            )
        print()


if __name__ == "__main__":
    main()
