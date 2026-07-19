"""Tests for the Kisrhombille CA transition-rule prototype (`tiling_patterns.ca_rule`)."""

from __future__ import annotations

import random

import pytest

from tiling_patterns.ca_rule import (
    CellState,
    RuleParams,
    _enforce_level_balance,
    activity,
    max_neighbor_level_gap,
    seed_grid,
    step,
)
from tiling_patterns.geometry import CellAddress, HexCoord, neighbors

EDGE_LENGTH = 1.0


def hexes_in_radius(radius: int) -> list[HexCoord]:
    coords = []
    for q in range(-radius, radius + 1):
        for r in range(max(-radius, -q - radius), min(radius, -q + radius) + 1):
            coords.append(HexCoord(q, r))
    return coords


def test_seed_grid_covers_every_sector_of_every_hex() -> None:
    hex_coords = hexes_in_radius(1)
    grid = seed_grid(hex_coords, random.Random(0), palette_size=3)
    assert len(grid) == 12 * len(hex_coords)
    for state in grid.values():
        assert 0 <= state.color_class < 3
        assert state.level == 0


def test_activity_counts_neighbors_with_a_different_color() -> None:
    address = CellAddress(HexCoord(0, 0), 0)
    same, other, differing = neighbors(address, EDGE_LENGTH)
    grid = {
        address: CellState(color_class=0, level=0),
        same: CellState(color_class=0, level=0),
        other: CellState(color_class=1, level=0),
        differing: CellState(color_class=2, level=0),
    }
    assert activity(address, grid, EDGE_LENGTH) == 2


def test_activity_ignores_missing_neighbors() -> None:
    address = CellAddress(HexCoord(0, 0), 0)
    grid = {address: CellState(color_class=0, level=0)}
    assert activity(address, grid, EDGE_LENGTH) == 0


def test_color_advances_when_successor_neighbor_present() -> None:
    address = CellAddress(HexCoord(0, 0), 0)
    successor_neighbor, other_a, other_b = neighbors(address, EDGE_LENGTH)
    grid = {
        address: CellState(color_class=0, level=0),
        successor_neighbor: CellState(color_class=1, level=0),  # (0 + 1) % 3
        other_a: CellState(color_class=0, level=0),
        other_b: CellState(color_class=0, level=0),
    }
    params = RuleParams(advance_neighbor_threshold=1)
    result = step(grid, params, EDGE_LENGTH)
    assert result[address].color_class == 1


def test_color_does_not_advance_below_threshold() -> None:
    address = CellAddress(HexCoord(0, 0), 0)
    successor_neighbor, other_a, other_b = neighbors(address, EDGE_LENGTH)
    grid = {
        address: CellState(color_class=0, level=0),
        successor_neighbor: CellState(color_class=1, level=0),
        other_a: CellState(color_class=0, level=0),
        other_b: CellState(color_class=0, level=0),
    }
    params = RuleParams(advance_neighbor_threshold=2)  # need 2 votes, only 1 present
    result = step(grid, params, EDGE_LENGTH)
    assert result[address].color_class == 0


def test_subdivides_when_activity_crosses_threshold() -> None:
    address = CellAddress(HexCoord(0, 0), 0)
    a, b, c = neighbors(address, EDGE_LENGTH)
    grid = {
        address: CellState(color_class=0, level=0),
        a: CellState(color_class=1, level=0),
        b: CellState(color_class=2, level=0),
        c: CellState(color_class=1, level=0),
    }
    params = RuleParams(subdivide_activity_threshold=2, advance_neighbor_threshold=99)
    result = step(grid, params, EDGE_LENGTH)
    assert result[address].level == 1


def test_subdivide_is_capped_at_max_level() -> None:
    address = CellAddress(HexCoord(0, 0), 0)
    a, b, c = neighbors(address, EDGE_LENGTH)
    grid = {
        address: CellState(color_class=0, level=2),
        a: CellState(color_class=1, level=2),
        b: CellState(color_class=2, level=2),
        c: CellState(color_class=1, level=2),
    }
    params = RuleParams(subdivide_activity_threshold=2, max_level=2, advance_neighbor_threshold=99)
    result = step(grid, params, EDGE_LENGTH)
    assert result[address].level == 2


def test_merge_requires_patience_generations_of_low_activity() -> None:
    address = CellAddress(HexCoord(0, 0), 0)
    a, b, c = neighbors(address, EDGE_LENGTH)
    grid = {
        address: CellState(color_class=0, level=1),
        a: CellState(color_class=0, level=1),
        b: CellState(color_class=0, level=1),
        c: CellState(color_class=0, level=1),
    }
    params = RuleParams(merge_activity_threshold=0, merge_patience=3, advance_neighbor_threshold=99, subdivide_activity_threshold=99)

    grid = step(grid, params, EDGE_LENGTH)
    assert grid[address].level == 1  # streak 1, not enough yet
    grid = step(grid, params, EDGE_LENGTH)
    assert grid[address].level == 1  # streak 2, not enough yet
    grid = step(grid, params, EDGE_LENGTH)
    assert grid[address].level == 0  # streak reaches merge_patience -> merges


def test_enforce_level_balance_closes_gaps_greater_than_one() -> None:
    address = CellAddress(HexCoord(0, 0), 0)
    a, b, c = neighbors(address, EDGE_LENGTH)
    tentative = {
        address: CellState(color_class=0, level=0),
        a: CellState(color_class=0, level=3),
        b: CellState(color_class=0, level=0),
        c: CellState(color_class=0, level=0),
    }
    params = RuleParams(max_level=4)
    balanced = _enforce_level_balance(tentative, EDGE_LENGTH, params)
    assert max_neighbor_level_gap(balanced, EDGE_LENGTH) <= 1
    # Balance only force-*subdivides* the shallower cell, never force-merges the deeper one.
    assert balanced[a].level == 3
    assert balanced[address].level == 2


@pytest.mark.parametrize("seed", [0, 1, 2])
def test_step_maintains_invariants_over_many_generations(seed: int) -> None:
    hex_coords = hexes_in_radius(2)
    grid = seed_grid(hex_coords, random.Random(seed), palette_size=3)
    params = RuleParams()
    for _ in range(20):
        grid = step(grid, params, EDGE_LENGTH)
        assert max_neighbor_level_gap(grid, EDGE_LENGTH) <= 1
        for state in grid.values():
            assert 0 <= state.color_class < params.palette_size
            assert 0 <= state.level <= params.max_level
