"""Tests for the Kisrhombille lattice geometry (see SPEC_002_KRB)."""

from __future__ import annotations

import math

import pytest

from tiling_patterns.geometry import (
    CellAddress,
    HexCoord,
    cell_centroid,
    fold_at_level,
    fold_to_fundamental,
    hex_center,
    hex_vertices,
    level_alignment_residual,
    level_edge_length,
    level_rotation,
    nearest_hex,
    neighbors,
    rotate,
    sector_corners,
    vertex_neighbors,
)

EDGE_LENGTH = 1.7


def test_rotate_preserves_length_and_rotates_by_angle() -> None:
    point = (1.0, 0.0)
    rotated = rotate(point, math.pi / 2.0)
    assert rotated[0] == pytest.approx(0.0, abs=1e-12)
    assert rotated[1] == pytest.approx(1.0, abs=1e-12)


@pytest.mark.parametrize("q", range(-3, 4))
@pytest.mark.parametrize("r", range(-3, 4))
def test_hex_center_and_nearest_hex_round_trip(q: int, r: int) -> None:
    hex_coord = HexCoord(q, r)
    center = hex_center(hex_coord, EDGE_LENGTH)
    assert nearest_hex(center, EDGE_LENGTH) == hex_coord


def test_hex_vertices_are_at_edge_length_from_center() -> None:
    hex_coord = HexCoord(2, -1)
    center = hex_center(hex_coord, EDGE_LENGTH)
    for vx, vy in hex_vertices(hex_coord, EDGE_LENGTH):
        radius = math.hypot(vx - center[0], vy - center[1])
        assert radius == pytest.approx(EDGE_LENGTH)


@pytest.mark.parametrize("sector", range(12))
def test_fold_recovers_sector_from_a_point_inside_it(sector: int) -> None:
    hex_coord = HexCoord(1, -2)
    center = hex_center(hex_coord, EDGE_LENGTH)
    o, m, v = sector_corners(sector, EDGE_LENGTH)
    centroid_local = tuple((o[i] + m[i] + v[i]) / 3.0 for i in range(2))
    probe = (center[0] + centroid_local[0], center[1] + centroid_local[1])

    address, radius, local_angle = fold_to_fundamental(probe, EDGE_LENGTH)

    assert address == CellAddress(hex_coord, sector)
    assert radius > 0.0
    assert 0.0 <= local_angle <= math.pi / 6.0 + 1e-12


def test_fold_local_angle_is_zero_at_right_angle_side_for_every_sector() -> None:
    """Local angle should approach 0 near the O-M (right-angle) edge, for both parities."""
    for sector in range(12):
        o, m, _v = sector_corners(sector, EDGE_LENGTH)
        # A point just off the O-M edge, on the sector's interior side.
        near_om = (m[0] * 0.99 + o[0] * 0.01, m[1] * 0.99 + o[1] * 0.01)
        _, _, local_angle = fold_to_fundamental(near_om, EDGE_LENGTH)
        assert local_angle < 0.05


def test_neighbors_returns_three_distinct_addresses() -> None:
    address = CellAddress(HexCoord(0, 0), 3)
    result = neighbors(address, EDGE_LENGTH)
    assert len(result) == 3
    assert len(set(result)) == 3
    assert address not in result


@pytest.mark.parametrize("sector", range(12))
def test_neighbor_adjacency_is_reciprocal(sector: int) -> None:
    """If B is a neighbor of A, A must be a neighbor of B (shared-edge symmetry)."""
    address = CellAddress(HexCoord(-1, 2), sector)
    for neighbor in neighbors(address, EDGE_LENGTH):
        assert address in neighbors(neighbor, EDGE_LENGTH)


@pytest.mark.parametrize("sector", range(12))
def test_vertex_neighbors_returns_exactly_thirteen_new_addresses(sector: int) -> None:
    """Every cell has exactly 13 vertex-sharing neighbors beyond its 3
    edge-neighbors (9 same-hex + 4 cross-hex, from 2 other hexagons) — a
    fixed count independent of sector, verified computationally rather than
    assumed (an earlier hand derivation predicted 12; the probe-based
    construction below is authoritative). Combined with `neighbors`, this
    is the full 16-neighbor "edge + vertex" extended neighborhood."""
    address = CellAddress(HexCoord(2, -1), sector)
    vertex_only = vertex_neighbors(address, EDGE_LENGTH)
    assert len(vertex_only) == 13
    assert len(set(vertex_only)) == 13
    assert address not in vertex_only
    edge_neighbors = set(neighbors(address, EDGE_LENGTH))
    assert edge_neighbors.isdisjoint(vertex_only)
    same_hex = [n for n in vertex_only if n.hex == address.hex]
    cross_hex = [n for n in vertex_only if n.hex != address.hex]
    assert len(same_hex) == 9
    assert len(cross_hex) == 4
    assert len({n.hex for n in cross_hex}) == 2  # exactly 2 other hexagons, 2 sectors each


@pytest.mark.parametrize("sector", range(12))
def test_vertex_neighbor_adjacency_is_reciprocal(sector: int) -> None:
    """If B is a vertex-neighbor of A, A must be a vertex-neighbor of B."""
    address = CellAddress(HexCoord(-2, 3), sector)
    for neighbor in vertex_neighbors(address, EDGE_LENGTH):
        assert address in vertex_neighbors(neighbor, EDGE_LENGTH)


def test_vertex_neighbors_stable_across_epsilon_choices() -> None:
    """The probe radius is an implementation detail, not part of the geometric claim — any small enough epsilon must agree."""
    address = CellAddress(HexCoord(0, 0), 5)
    baseline = set(vertex_neighbors(address, EDGE_LENGTH, epsilon=EDGE_LENGTH * 1e-4))
    for epsilon in (EDGE_LENGTH * 1e-3, EDGE_LENGTH * 1e-5, EDGE_LENGTH * 1e-6):
        assert set(vertex_neighbors(address, EDGE_LENGTH, epsilon=epsilon)) == baseline


def test_cell_centroid_lies_within_hex_radius() -> None:
    address = CellAddress(HexCoord(3, -3), 7)
    center = hex_center(address.hex, EDGE_LENGTH)
    centroid = cell_centroid(address, EDGE_LENGTH)
    radius = math.hypot(centroid[0] - center[0], centroid[1] - center[1])
    assert 0.0 < radius < EDGE_LENGTH


def test_level_edge_length_shrinks_by_sqrt3_per_level() -> None:
    assert level_edge_length(EDGE_LENGTH, 0) == pytest.approx(EDGE_LENGTH)
    assert level_edge_length(EDGE_LENGTH, 1) == pytest.approx(EDGE_LENGTH / math.sqrt(3.0))
    assert level_edge_length(EDGE_LENGTH, 2) == pytest.approx(EDGE_LENGTH / 3.0)


def test_level_rotation_is_30_degrees_per_level() -> None:
    assert level_rotation(0) == pytest.approx(0.0)
    assert level_rotation(1) == pytest.approx(-math.pi / 6.0)
    assert level_rotation(3) == pytest.approx(-math.pi / 2.0)


@pytest.mark.parametrize("level", range(4))
@pytest.mark.parametrize(
    "child_hex",
    [
        HexCoord(1, 0),  # (q - r) % 3 == 1 -> lands on a parent vertex
        HexCoord(0, 1),  # (q - r) % 3 == 2 -> lands on a parent vertex
        HexCoord(-2, 3),  # (q - r) % 3 == 1 -> lands on a parent vertex
        HexCoord(4, -1),  # (q - r) % 3 == 2 -> lands on a parent vertex
        HexCoord(2, 2),  # (q - r) % 3 == 0, non-origin -> lands on a parent center
        HexCoord(-3, 3),  # (q - r) % 3 == 0, non-origin -> lands on a parent center
    ],
)
def test_level_alignment_residual_is_near_zero(level: int, child_hex: HexCoord) -> None:
    """The core geometric claim of SPEC_002_KRB Section 2: every child-level hex
    center lands exactly on a parent-level hex center or vertex (a residue-mod-3
    trichotomy — the Generalized Balanced Ternary hex hierarchy), for every level
    and every non-origin child hex. The origin itself is excluded: it is the
    fixed point of every level's rotation+scale, so it trivially coincides with
    the shared origin at every level regardless of whether the refinement
    relation actually holds — it cannot distinguish the claim from a false one."""
    residual = level_alignment_residual(EDGE_LENGTH, level, child_hex)
    assert residual < 1e-9 * EDGE_LENGTH


def test_fold_at_level_matches_fold_to_fundamental_at_level_zero() -> None:
    point = (0.4, -0.3)
    address_a, radius_a, angle_a = fold_at_level(point, EDGE_LENGTH, 0)
    address_b, radius_b, angle_b = fold_to_fundamental(point, EDGE_LENGTH)
    assert address_a == address_b
    assert radius_a == pytest.approx(radius_b)
    assert angle_a == pytest.approx(angle_b)
