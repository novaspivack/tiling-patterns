"""Kisrhombille lattice geometry.

The Kisrhombille tessellation is the reflective fundamental-domain tiling of
the Euclidean (2,3,6) triangle group: a regular hexagon of edge length
``edge_length``, split by its 6 center-to-vertex spokes and 6
center-to-edge-midpoint spokes into 12 congruent 30-60-90 triangles.

This module answers, for any point in the plane, which fundamental triangle
contains it (:func:`fold_to_fundamental`) without building an explicit mesh,
finds a cell's 3 edge-neighbors by construction rather than by an index
table (:func:`neighbors`), and implements the self-similar relation between
successive multi-level refinements (:func:`level_edge_length`,
:func:`level_rotation`, :func:`fold_at_level`, :func:`level_alignment_residual`).
"""

from __future__ import annotations

import math
from dataclasses import dataclass

Vec2 = tuple[float, float]

_SQRT3 = math.sqrt(3.0)
_SECTOR_ANGLE = math.pi / 6.0  # 30 degrees: one fundamental-triangle wedge
_LEVEL_ROTATION_STEP = -math.pi / 6.0  # -30 degrees per finer level
_LEVEL_SCALE_STEP = 1.0 / _SQRT3


@dataclass(frozen=True)
class HexCoord:
    """Axial coordinates of one hexagon in a pointy-top hex lattice."""

    q: int
    r: int


@dataclass(frozen=True)
class CellAddress:
    """One of the 12 fundamental 30-60-90 triangles inside a hexagon.

    ``sector`` is a 30-degree wedge index in ``[0, 12)``, increasing
    counterclockwise from angle 0 (a center-to-edge-midpoint spoke). Even
    sectors have their right angle at the wedge's starting boundary (an
    edge-midpoint); odd sectors have it at the ending boundary — the two
    parities are mirror images of each other across their shared boundary.
    """

    hex: HexCoord
    sector: int


def rotate(point: Vec2, angle: float) -> Vec2:
    """Rotate `point` counterclockwise by `angle` radians about the origin."""
    x, y = point
    ca, sa = math.cos(angle), math.sin(angle)
    return (x * ca - y * sa, x * sa + y * ca)


def hex_center(hex_coord: HexCoord, edge_length: float) -> Vec2:
    """Cartesian center of a pointy-top hexagon at the given axial coordinates."""
    q, r = hex_coord.q, hex_coord.r
    x = edge_length * (_SQRT3 * q + _SQRT3 / 2.0 * r)
    y = edge_length * (1.5 * r)
    return (x, y)


def hex_vertices(hex_coord: HexCoord, edge_length: float) -> list[Vec2]:
    """The 6 vertices of a pointy-top hexagon, at angles 30 + 60k degrees."""
    cx, cy = hex_center(hex_coord, edge_length)
    vertices = []
    for k in range(6):
        angle = _SECTOR_ANGLE + k * 2.0 * _SECTOR_ANGLE
        vertices.append((cx + edge_length * math.cos(angle), cy + edge_length * math.sin(angle)))
    return vertices


def nearest_hex(point: Vec2, edge_length: float) -> HexCoord:
    """Axial coordinates of the hexagon whose center is nearest to `point`."""
    x, y = point
    q = (_SQRT3 / 3.0 * x - y / 3.0) / edge_length
    r = (2.0 / 3.0 * y) / edge_length
    return _round_axial(q, r)


def _round_axial(q: float, r: float) -> HexCoord:
    """Round fractional axial coordinates to the nearest integer hex.

    Standard cube-coordinate rounding: round all three cube coordinates
    independently, then correct whichever axis rounded the most so the cube
    constraint ``x + y + z == 0`` is restored exactly.
    """
    x, z = q, r
    y = -x - z
    rx, ry, rz = round(x), round(y), round(z)
    dx, dy, dz = abs(rx - x), abs(ry - y), abs(rz - z)
    if dx > dy and dx > dz:
        rx = -ry - rz
    elif dy > dz:
        ry = -rx - rz
    else:
        rz = -rx - ry
    return HexCoord(int(rx), int(rz))


def sector_corners(sector: int, edge_length: float) -> tuple[Vec2, Vec2, Vec2]:
    """Hex-center-relative corners `(O, M, V)` of one fundamental triangle.

    `O` is the hex center (right-angle-free apex, 30 degrees), `M` is the
    edge-midpoint (right angle, 90 degrees), `V` is the hex vertex (60
    degrees). `O` is always the local origin.
    """
    apothem = edge_length * _SQRT3 / 2.0
    start_angle = sector * _SECTOR_ANGLE
    end_angle = (sector + 1) * _SECTOR_ANGLE
    m_angle, v_angle = (start_angle, end_angle) if sector % 2 == 0 else (end_angle, start_angle)
    m_point = (apothem * math.cos(m_angle), apothem * math.sin(m_angle))
    v_point = (edge_length * math.cos(v_angle), edge_length * math.sin(v_angle))
    return (0.0, 0.0), m_point, v_point


def fold_to_fundamental(point: Vec2, edge_length: float) -> tuple[CellAddress, float, float]:
    """Map a point to its cell address plus local polar coordinates.

    Returns ``(address, local_radius, local_angle)`` where `local_angle` is in
    `[0, pi/6]`, measured from the cell's right-angle-vertex side (0) to its
    hex-vertex side (pi/6), for both sector parities (odd sectors are folded
    to share this convention with even sectors).
    """
    hex_coord = nearest_hex(point, edge_length)
    cx, cy = hex_center(hex_coord, edge_length)
    px, py = point[0] - cx, point[1] - cy
    radius = math.hypot(px, py)
    if radius == 0.0:
        return CellAddress(hex_coord, 0), 0.0, 0.0
    theta = math.atan2(py, px) % (2.0 * math.pi)
    raw_sector = int(theta // _SECTOR_ANGLE)
    local_theta = theta - raw_sector * _SECTOR_ANGLE
    sector = raw_sector % 12
    if sector % 2 == 1:
        local_theta = _SECTOR_ANGLE - local_theta
    return CellAddress(hex_coord, sector), radius, local_theta


def cell_centroid(address: CellAddress, edge_length: float) -> Vec2:
    """World-space centroid of one fundamental triangle."""
    hx, hy = hex_center(address.hex, edge_length)
    o, m, v = sector_corners(address.sector, edge_length)
    return (hx + (o[0] + m[0] + v[0]) / 3.0, hy + (o[1] + m[1] + v[1]) / 3.0)


def neighbors(address: CellAddress, edge_length: float, epsilon: float | None = None) -> list[CellAddress]:
    """The 3 edge-adjacent cells, found by construction rather than an index table.

    For each of the triangle's 3 edges, steps a small distance from that
    edge's midpoint away from the triangle's own centroid, then re-runs
    :func:`fold_to_fundamental` on the stepped-out point — this discovers the
    correct neighbor hex and sector (in-hex across a spoke edge, or the
    adjacent hexagon across the outer edge) without any hand-derived index
    arithmetic. Returns them in edge order ``[O-M, M-V, O-V]``.
    """
    if epsilon is None:
        epsilon = edge_length * 1e-6
    o, m, v = sector_corners(address.sector, edge_length)
    centroid_local = ((o[0] + m[0] + v[0]) / 3.0, (o[1] + m[1] + v[1]) / 3.0)
    hx, hy = hex_center(address.hex, edge_length)
    results: list[CellAddress] = []
    for a, b in ((o, m), (m, v), (o, v)):
        mid = ((a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0)
        direction = (mid[0] - centroid_local[0], mid[1] - centroid_local[1])
        norm = math.hypot(*direction)
        step = (direction[0] / norm * epsilon, direction[1] / norm * epsilon)
        probe_local = (mid[0] + step[0], mid[1] + step[1])
        probe_world = (hx + probe_local[0], hy + probe_local[1])
        neighbor_addr, _, _ = fold_to_fundamental(probe_world, edge_length)
        results.append(neighbor_addr)
    return results


def vertex_neighbors(address: CellAddress, edge_length: float, epsilon: float | None = None) -> list[CellAddress]:
    """Cells that share a vertex with `address` but not a full edge (see `neighbors`).

    Every fundamental triangle has 3 vertices, each shared by several other
    triangles besides the 3 edge-neighbors — the same conceptual step from a
    square grid's von-Neumann (edge-only) to Moore (edge + corner)
    neighborhood. Found the same way `neighbors` finds edge-neighbors: probe
    a ring of points at a tiny radius around each vertex (at enough angles
    to land in every wedge meeting there) and fold each probe back to a
    cell address, rather than deriving the index arithmetic by hand — errors
    in that arithmetic are easy to make and hard to notice, while this is
    directly checkable (see `tests/test_geometry.py` for the exact counts
    this produces and the symmetry checks on them).
    """
    if epsilon is None:
        epsilon = edge_length * 1e-4
    o, m, v = sector_corners(address.sector, edge_length)
    hx, hy = hex_center(address.hex, edge_length)
    excluded = {(n.hex.q, n.hex.r, n.sector) for n in neighbors(address, edge_length)}
    excluded.add((address.hex.q, address.hex.r, address.sector))
    found: dict[tuple[int, int, int], CellAddress] = {}
    num_probe_angles = 48  # finer than the smallest wedge angle meeting at any of the 3 vertex kinds
    for vertex_local in (o, m, v):
        vx, vy = hx + vertex_local[0], hy + vertex_local[1]
        for k in range(num_probe_angles):
            angle = 2.0 * math.pi * k / num_probe_angles
            probe = (vx + epsilon * math.cos(angle), vy + epsilon * math.sin(angle))
            neighbor_addr, _, _ = fold_to_fundamental(probe, edge_length)
            key = (neighbor_addr.hex.q, neighbor_addr.hex.r, neighbor_addr.sector)
            if key not in excluded:
                found[key] = neighbor_addr
    return list(found.values())


def level_edge_length(base_edge_length: float, level: int) -> float:
    """Hexagon edge length at refinement `level` (0 = coarsest)."""
    return base_edge_length * (_LEVEL_SCALE_STEP**level)


def level_rotation(level: int) -> float:
    """World-space rotation (radians) of refinement `level` relative to level 0."""
    return _LEVEL_ROTATION_STEP * level


def fold_at_level(point: Vec2, base_edge_length: float, level: int) -> tuple[CellAddress, float, float]:
    """:func:`fold_to_fundamental`, in world coordinates, at a given refinement level."""
    local_point = rotate(point, -level_rotation(level))
    return fold_to_fundamental(local_point, level_edge_length(base_edge_length, level))


def level_alignment_residual(base_edge_length: float, level: int, child_hex: HexCoord) -> float:
    """Distance from a level-`(level + 1)` hex center to the nearest level-`level`
    hex center *or* vertex, whichever is closer.

    Used to verify the self-similar refinement relation (see module docstring
    and `SPEC_002_KRB` Section 2): scaling by `1/sqrt(3)` and rotating by -30
    degrees per finer level is the standard aperture-3 hierarchical hexagonal
    grid refinement (a "Generalized Balanced Ternary" hex addressing scheme).
    Every child-level hex center lands *exactly* on a parent-level lattice
    feature — a parent hex *center* when `(child.q - child.r) % 3 == 0`,
    otherwise a parent hex *vertex* — for any level and any child hex
    coordinates. A residual near machine epsilon confirms this; anything else
    disproves it.
    """
    child_level = level + 1
    child_center_canonical = hex_center(child_hex, level_edge_length(base_edge_length, child_level))
    child_center_world = rotate(child_center_canonical, level_rotation(child_level))
    child_center_in_parent_frame = rotate(child_center_world, -level_rotation(level))
    parent_hex = nearest_hex(child_center_in_parent_frame, level_edge_length(base_edge_length, level))
    parent_center = hex_center(parent_hex, level_edge_length(base_edge_length, level))
    candidates = [parent_center, *hex_vertices(parent_hex, level_edge_length(base_edge_length, level))]
    return min(math.hypot(child_center_in_parent_frame[0] - cx, child_center_in_parent_frame[1] - cy) for cx, cy in candidates)
