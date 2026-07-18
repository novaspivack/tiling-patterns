"""Tests for the generalized outer-totalistic CA (`tiling_patterns.outer_totalistic`),
including a cross-check against `geometry.neighbors` directly (independent of the
vectorized `CROSS_HEX_NEIGHBOR` table) to catch indexing/roll-direction bugs."""

from __future__ import annotations

import random

import numpy as np
import pytest

from tiling_patterns.geometry import CellAddress, HexCoord, neighbors, vertex_neighbors
from tiling_patterns.outer_totalistic import (
    ToroidalGrid,
    activity_fraction,
    decode_rule,
    encode_rule,
    max_neighbor_sum,
    random_table,
    state_entropy,
    step,
    table_size,
)

EDGE_LENGTH = 1.0


@pytest.mark.parametrize("num_states", [2, 3, 4, 9])
@pytest.mark.parametrize("num_neighbors", [3, 16])
def test_encode_decode_round_trips_for_random_tables(num_states: int, num_neighbors: int) -> None:
    table = random_table(num_states, random.Random(num_states), num_neighbors)
    code = encode_rule(num_states, table, num_neighbors)
    decoded_states, decoded_neighbors, decoded_table = decode_rule(code)
    assert decoded_states == num_states
    assert decoded_neighbors == num_neighbors
    assert np.array_equal(decoded_table, table)


def test_decode_rule_defaults_to_3_neighbors_for_legacy_codes_without_an_n_segment() -> None:
    """Codes saved before the extended neighborhood existed must keep decoding exactly as they always have."""
    _, num_neighbors, _ = decode_rule("K3R8045469900")
    assert num_neighbors == 3


def test_encode_rule_rejects_wrong_table_size() -> None:
    with pytest.raises(ValueError, match="entries"):
        encode_rule(3, np.zeros(5, dtype=np.uint8))


def test_decode_rule_rejects_malformed_code() -> None:
    with pytest.raises(ValueError, match="not a valid rule code"):
        decode_rule("not-a-rule")


def test_decode_rule_rejects_rule_number_too_large() -> None:
    huge = 2 ** (table_size(2) * 10)
    with pytest.raises(ValueError, match="too large"):
        decode_rule(f"K2R{huge}")


def test_binary_life_like_rule_matches_geometry_neighbors_directly() -> None:
    """Cross-check the vectorized toroidal `step` against a hand-rolled
    computation using `geometry.neighbors` directly, for every cell in a
    small patch — this is independent of `CROSS_HEX_NEIGHBOR` and so also
    catches a wrong roll direction or axis in `step`'s vectorization."""
    num_states = 2
    rng = random.Random(7)
    table = random_table(num_states, rng)
    width, height = 6, 6
    grid_shape = ToroidalGrid(width, height)
    grid = grid_shape.seed_random(num_states, rng)

    next_grid = step(grid, num_states, table)
    max_sum = max_neighbor_sum(num_states)

    for r in range(height):
        for q in range(width):
            for sector in range(12):
                address = CellAddress(HexCoord(q, r), sector)
                own = int(grid[r, q, sector])
                neighbor_sum = 0
                for neighbor in neighbors(address, EDGE_LENGTH):
                    nq, nr = neighbor.hex.q % width, neighbor.hex.r % height
                    neighbor_sum += int(grid[nr, nq, neighbor.sector])
                expected = int(table[own * (max_sum + 1) + neighbor_sum])
                assert int(next_grid[r, q, sector]) == expected


def test_extended_neighborhood_step_matches_geometry_vertex_neighbors_directly() -> None:
    """Same cross-check as above, but for the 16-neighbor ('edge + vertex')
    mode — independent of `VERTEX_NEIGHBOR`, so it also catches a wrong roll
    direction/axis specific to the vertex-neighbor summation branch."""
    num_states = 2
    num_neighbors = 16
    rng = random.Random(11)
    table = random_table(num_states, rng, num_neighbors)
    width, height = 6, 6
    grid_shape = ToroidalGrid(width, height)
    grid = grid_shape.seed_random(num_states, rng)

    next_grid = step(grid, num_states, table, num_neighbors)
    max_sum = max_neighbor_sum(num_states, num_neighbors)

    for r in range(height):
        for q in range(width):
            for sector in range(12):
                address = CellAddress(HexCoord(q, r), sector)
                own = int(grid[r, q, sector])
                all_neighbors = neighbors(address, EDGE_LENGTH) + vertex_neighbors(address, EDGE_LENGTH)
                assert len(all_neighbors) == num_neighbors
                neighbor_sum = 0
                for neighbor in all_neighbors:
                    nq, nr = neighbor.hex.q % width, neighbor.hex.r % height
                    neighbor_sum += int(grid[nr, nq, neighbor.sector])
                expected = int(table[own * (max_sum + 1) + neighbor_sum])
                assert int(next_grid[r, q, sector]) == expected


def test_activity_fraction_and_state_entropy_basic_properties() -> None:
    identical = np.zeros((3, 3, 12), dtype=np.uint8)
    assert activity_fraction(identical, identical) == 0.0

    changed = identical.copy()
    changed[0, 0, 0] = 1
    assert activity_fraction(identical, changed) == pytest.approx(1.0 / identical.size)

    assert state_entropy(identical, num_states=3) == 0.0  # a single state -> zero entropy

    rng = np.random.default_rng(0)
    uniform_random = rng.integers(0, 3, size=(40, 40, 12), dtype=np.uint8)
    assert state_entropy(uniform_random, num_states=3) > 0.95  # near-maximal for a large uniform-random sample
