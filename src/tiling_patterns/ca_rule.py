"""Small-grid prototype of the Kisrhombille CA transition rule (`SPEC_002_KRB`
Sections 3-4): cyclic color competition, subdivide/merge triggers with merge
hysteresis, and the level-balance constraint.

Scope: this module verifies the rule's *control logic* — the thresholds and
hysteresis that decide when a cell advances color, subdivides, or merges —
on the level-0 adjacency graph, with a per-cell integer `level` field
standing in for "how deep this location is currently refined." It
intentionally does not instantiate the finer-level geometry a subdivided
cell would spatially own (a child Kisrhombille sub-grid, per
`geometry.py` Section 2); that spatial instantiation is the WebGL engine's
job (`EPIC_002` queue items 4-5). Tuning the logic here in milliseconds,
before porting it to GLSL, is the entire point of this module.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, replace

from tiling_patterns.geometry import CellAddress, HexCoord, neighbors


@dataclass(frozen=True)
class CellState:
    """State of one cell: its color class, current refinement level, and how
    many consecutive generations it has been quiet (drives merge hysteresis)."""

    color_class: int
    level: int
    quiet_streak: int = 0


@dataclass(frozen=True)
class RuleParams:
    """Tunable thresholds from `SPEC_002_KRB` Section 4.

    Defaults are empirically chosen (see `experiments/ca_rule_parameter_sweep.py`):
    a 1-of-3-neighbor `advance_neighbor_threshold` makes color flips so easy
    that the grid never quiets down long enough to merge, and every cell
    saturates to `max_level` within ~10 generations — visually degenerate (no
    density variation at all). Requiring 2-of-3 neighbor consensus lets most
    of the grid settle into a static, spatially varied configuration whose
    level distribution falls off geometrically from level 0 (matching the
    reference image's mostly-flat-with-rare-deep-subdivision character)
    rather than saturating.
    """

    palette_size: int = 3
    advance_neighbor_threshold: int = 2
    subdivide_activity_threshold: int = 3
    merge_activity_threshold: int = 0
    merge_patience: int = 4
    max_level: int = 4


Grid = dict[CellAddress, CellState]


def seed_grid(hex_coords: list[HexCoord], rng: random.Random, palette_size: int = 3) -> Grid:
    """A random level-0 grid: every one of the 12 sectors of each given hex,
    with a uniformly random color class and level 0."""
    grid: Grid = {}
    for hex_coord in hex_coords:
        for sector in range(12):
            address = CellAddress(hex_coord, sector)
            grid[address] = CellState(color_class=rng.randrange(palette_size), level=0)
    return grid


def neighbor_states(address: CellAddress, grid: Grid, edge_length: float) -> list[CellState | None]:
    """The 3 edge-neighbors' states, in `geometry.neighbors` order; `None` for
    a neighbor not present in `grid` (a grid boundary in this small prototype)."""
    return [grid.get(n) for n in neighbors(address, edge_length)]


def activity(address: CellAddress, grid: Grid, edge_length: float) -> int:
    """Count of existing neighbors whose color class differs from this cell's
    own — the competition intensity driving both cyclic color advance and the
    subdivide/merge triggers."""
    own = grid[address]
    return sum(1 for state in neighbor_states(address, grid, edge_length) if state is not None and state.color_class != own.color_class)


def _next_color_class(address: CellAddress, grid: Grid, edge_length: float, params: RuleParams) -> int:
    own = grid[address]
    successor = (own.color_class + 1) % params.palette_size
    successor_votes = sum(1 for state in neighbor_states(address, grid, edge_length) if state is not None and state.color_class == successor)
    if successor_votes >= params.advance_neighbor_threshold:
        return successor
    return own.color_class


def _next_level_and_streak(address: CellAddress, grid: Grid, edge_length: float, params: RuleParams) -> tuple[int, int]:
    own = grid[address]
    local_activity = activity(address, grid, edge_length)

    if local_activity >= params.subdivide_activity_threshold:
        next_level = min(own.level + 1, params.max_level)
        return next_level, 0

    if local_activity <= params.merge_activity_threshold:
        streak = own.quiet_streak + 1
        if streak >= params.merge_patience and own.level > 0:
            return own.level - 1, 0
        return own.level, streak

    return own.level, 0


def _enforce_level_balance(tentative: Grid, edge_length: float, params: RuleParams) -> Grid:
    """Repeatedly force-subdivide (never force-merge) any cell whose level
    trails an existing neighbor's level by more than 1, until stable — the
    `SPEC_002_KRB` Section 4.4 balance constraint."""
    current = dict(tentative)
    for _ in range(params.max_level + 1):
        changed = False
        for address, state in list(current.items()):
            neighbor_levels = [n.level for n in neighbor_states(address, current, edge_length) if n is not None]
            if not neighbor_levels:
                continue
            required = min(max(neighbor_levels) - 1, params.max_level)
            if required > state.level:
                current[address] = replace(state, level=required, quiet_streak=0)
                changed = True
        if not changed:
            break
    return current


def step(grid: Grid, params: RuleParams, edge_length: float) -> Grid:
    """One synchronous generation: cyclic color advance, then subdivide/merge
    with hysteresis (both read from `grid`, the previous generation, so the
    update is simultaneous rather than sequential), then level-balance
    enforcement. Returns a new grid; does not mutate `grid`."""
    tentative: Grid = {}
    for address in grid:
        next_color = _next_color_class(address, grid, edge_length, params)
        next_level, next_streak = _next_level_and_streak(address, grid, edge_length, params)
        tentative[address] = CellState(color_class=next_color, level=next_level, quiet_streak=next_streak)
    return _enforce_level_balance(tentative, edge_length, params)


def max_neighbor_level_gap(grid: Grid, edge_length: float) -> int:
    """Largest `|level(a) - level(b)|` over edge-adjacent cells both present
    in `grid` — used to check the balance invariant holds after `step`."""
    worst = 0
    for address, state in grid.items():
        for neighbor_state in neighbor_states(address, grid, edge_length):
            if neighbor_state is None:
                continue
            worst = max(worst, abs(state.level - neighbor_state.level))
    return worst
