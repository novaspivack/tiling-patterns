"""Generalized k-state outer-totalistic CA on the Kisrhombille lattice,
under either of 2 neighborhood sizes.

This mirrors `web/js/rule.js` and `web/js/engine.js` exactly — same rule
encoding, same toroidal adjacency, same 2 neighborhood options — so a rule
code found by searching here (`experiments/goldilocks_rule_search.py`) runs
identically in the browser engine. A rule is a lookup table
``next = table[own_state * (max_sum + 1) + neighbor_sum]``, encoded as
``K{numStates}N{numNeighbors}R{decimal}`` (the table read as a
little-endian base-`numStates` numeral; the ``N{numNeighbors}`` segment is
optional on input and defaults to 3, for rule codes saved before the
extended neighborhood existed).

- "edge" (3 neighbors): the classic neighborhood - each cell's 3
  edge-adjacent neighbors (`CROSS_HEX_NEIGHBOR` + the 2 in-hex neighbors).
- "edge+vertex" (16 neighbors): the 3 edge-neighbors plus every other cell
  sharing one of the triangle's 3 vertices (`VERTEX_NEIGHBOR`) - the same
  conceptual step from a square grid's von-Neumann to Moore neighborhood.
"""

from __future__ import annotations

import random
import re
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from tiling_patterns.lattice import CROSS_HEX_NEIGHBOR, NUM_SECTORS, VERTEX_NEIGHBOR

MIN_STATES = 2
MAX_STATES = 9
NUM_NEIGHBORS_OPTIONS = (3, 16)
DEFAULT_NUM_NEIGHBORS = 3

RuleTable = NDArray[np.uint8]
#: Shape `(height, width, 12)` — matches the WebGL engine's `TEXTURE_2D_ARRAY` layout.
Grid = NDArray[np.uint8]

_RULE_CODE_PATTERN = re.compile(r"^K(\d+)(?:N(\d+))?R(\d+)$")


def validate_num_neighbors(num_neighbors: int) -> None:
    if num_neighbors not in NUM_NEIGHBORS_OPTIONS:
        raise ValueError(f"num_neighbors must be one of {NUM_NEIGHBORS_OPTIONS}, got {num_neighbors}")


def max_neighbor_sum(num_states: int, num_neighbors: int = DEFAULT_NUM_NEIGHBORS) -> int:
    return num_neighbors * (num_states - 1)


def table_size(num_states: int, num_neighbors: int = DEFAULT_NUM_NEIGHBORS) -> int:
    return num_states * (max_neighbor_sum(num_states, num_neighbors) + 1)


def validate_state_count(num_states: int) -> None:
    if not (MIN_STATES <= num_states <= MAX_STATES):
        raise ValueError(f"num_states must be in [{MIN_STATES}, {MAX_STATES}], got {num_states}")


def random_table(num_states: int, rng: random.Random, num_neighbors: int = DEFAULT_NUM_NEIGHBORS) -> RuleTable:
    validate_state_count(num_states)
    validate_num_neighbors(num_neighbors)
    size = table_size(num_states, num_neighbors)
    return np.array([rng.randrange(num_states) for _ in range(size)], dtype=np.uint8)


def encode_rule(num_states: int, table: RuleTable, num_neighbors: int = DEFAULT_NUM_NEIGHBORS) -> str:
    validate_state_count(num_states)
    validate_num_neighbors(num_neighbors)
    size = table_size(num_states, num_neighbors)
    if table.shape[0] != size:
        raise ValueError(f"table has {table.shape[0]} entries, expected {size} for {num_states} states / {num_neighbors} neighbors")
    rule_number = 0
    for digit in reversed(table.tolist()):
        rule_number = rule_number * num_states + int(digit)
    return f"K{num_states}N{num_neighbors}R{rule_number}"


def decode_rule(code: str) -> tuple[int, int, RuleTable]:
    """Returns `(num_states, num_neighbors, table)`."""
    match = _RULE_CODE_PATTERN.match(code.strip())
    if not match:
        raise ValueError(f"{code!r} is not a valid rule code (expected format K<states>R<number> or K<states>N<neighbors>R<number>)")
    num_states = int(match.group(1))
    num_neighbors = DEFAULT_NUM_NEIGHBORS if match.group(2) is None else int(match.group(2))
    validate_state_count(num_states)
    validate_num_neighbors(num_neighbors)
    remaining = int(match.group(3))
    size = table_size(num_states, num_neighbors)
    table = np.zeros(size, dtype=np.uint8)
    for i in range(size):
        table[i] = remaining % num_states
        remaining //= num_states
    if remaining != 0:
        raise ValueError(f"{code!r} encodes a rule number too large for {num_states} states / {num_neighbors} neighbors ({size} table entries)")
    return num_states, num_neighbors, table


@dataclass(frozen=True)
class ToroidalGrid:
    """A `width` (q) by `height` (r) toroidal patch of the level-0 lattice."""

    width: int
    height: int

    def seed_random(self, num_states: int, rng: random.Random) -> Grid:
        return np.array(
            [[rng.randrange(num_states) for _ in range(NUM_SECTORS)] for _ in range(self.width * self.height)],
            dtype=np.uint8,
        ).reshape(self.height, self.width, NUM_SECTORS)


def step(grid: Grid, num_states: int, table: RuleTable, num_neighbors: int = DEFAULT_NUM_NEIGHBORS) -> Grid:
    """One synchronous generation, vectorized over the whole toroidal patch."""
    max_sum = max_neighbor_sum(num_states, num_neighbors)
    next_grid = np.empty_like(grid)
    for sector in range(NUM_SECTORS):
        own = grid[:, :, sector].astype(np.int64)
        in_hex_a = grid[:, :, (sector + 11) % NUM_SECTORS].astype(np.int64)
        in_hex_b = grid[:, :, (sector + 1) % NUM_SECTORS].astype(np.int64)
        dq, dr, cross_sector = CROSS_HEX_NEIGHBOR[sector]
        cross_layer = grid[:, :, cross_sector]
        cross = np.roll(np.roll(cross_layer, -dr, axis=0), -dq, axis=1).astype(np.int64)
        neighbor_sum = in_hex_a + in_hex_b + cross
        if num_neighbors == 16:
            for vdq, vdr, vsector in VERTEX_NEIGHBOR[sector]:
                v_layer = grid[:, :, vsector]
                neighbor_sum = neighbor_sum + np.roll(np.roll(v_layer, -vdr, axis=0), -vdq, axis=1).astype(np.int64)
        table_index = own * (max_sum + 1) + neighbor_sum
        next_grid[:, :, sector] = table[table_index]
    return next_grid


def activity_fraction(previous: Grid, current: Grid) -> float:
    """Fraction of cells whose state changed between two generations."""
    return float(np.mean(previous != current))


def state_entropy(grid: Grid, num_states: int) -> float:
    """Shannon entropy (bits) of the state histogram, normalized to `[0, 1]`
    by dividing by `log2(num_states)` (1.0 = states are perfectly uniform)."""
    counts = np.bincount(grid.ravel(), minlength=num_states).astype(np.float64)
    probabilities = counts / counts.sum()
    nonzero = probabilities[probabilities > 0]
    entropy_bits = float(-np.sum(nonzero * np.log2(nonzero)))
    max_entropy_bits = np.log2(num_states)
    return entropy_bits / max_entropy_bits if max_entropy_bits > 0 else 0.0
