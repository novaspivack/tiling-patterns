"""Regression test: `tiling_patterns.lattice.CROSS_HEX_NEIGHBOR` must always
match what `geometry.neighbors` actually computes (see
`scripts/generate_lattice_tables.py`, which derives this table)."""

from __future__ import annotations

from tiling_patterns.geometry import CellAddress, HexCoord, neighbors, vertex_neighbors
from tiling_patterns.lattice import CROSS_HEX_NEIGHBOR, NUM_SECTORS, VERTEX_NEIGHBOR

EDGE_LENGTH = 1.0
ORIGIN = HexCoord(0, 0)


def _derived_cross_hex_neighbor(sector: int) -> tuple[int, int, int]:
    address = CellAddress(ORIGIN, sector)
    candidates = [n for n in neighbors(address, EDGE_LENGTH) if n.hex != ORIGIN]
    assert len(candidates) == 1
    neighbor = candidates[0]
    return neighbor.hex.q - ORIGIN.q, neighbor.hex.r - ORIGIN.r, neighbor.sector


def test_committed_table_matches_geometry_neighbors() -> None:
    for sector in range(NUM_SECTORS):
        assert CROSS_HEX_NEIGHBOR[sector] == _derived_cross_hex_neighbor(sector)


def test_in_hex_neighbors_are_always_sector_plus_minus_one() -> None:
    for sector in range(NUM_SECTORS):
        address = CellAddress(ORIGIN, sector)
        in_hex = {n.sector for n in neighbors(address, EDGE_LENGTH) if n.hex == ORIGIN}
        assert in_hex == {(sector - 1) % NUM_SECTORS, (sector + 1) % NUM_SECTORS}


def _derived_vertex_neighbor(sector: int) -> tuple[tuple[int, int, int], ...]:
    address = CellAddress(ORIGIN, sector)
    return tuple(sorted((n.hex.q - ORIGIN.q, n.hex.r - ORIGIN.r, n.sector) for n in vertex_neighbors(address, EDGE_LENGTH)))


def test_committed_vertex_table_matches_geometry_vertex_neighbors() -> None:
    for sector in range(NUM_SECTORS):
        assert VERTEX_NEIGHBOR[sector] == _derived_vertex_neighbor(sector)
