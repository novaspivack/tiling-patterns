"""Visual + numeric verification of the Kisrhombille multi-level refinement relation.

Renders the level-0 Kisrhombille lattice (hexagons split into their 12
fundamental 30-60-90 triangles) over a small region, overlays level-1 and
level-2 hex centers, and prints the numeric alignment residuals from
`tiling_patterns.geometry.level_alignment_residual` (see SPEC_002_KRB
Section 2) — the plotted level-1/2 centers should sit exactly on level-0
vertices or centers, with no visible offset.

Run: `python experiments/kisrhombille_geometry_check.py`
Output: `experiments/output/kisrhombille_geometry_check.png`
"""

from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt

from tiling_patterns.geometry import (
    HexCoord,
    hex_center,
    hex_vertices,
    level_alignment_residual,
    level_edge_length,
    level_rotation,
    rotate,
    sector_corners,
)

BASE_EDGE_LENGTH = 1.0
GRID_RADIUS = 3  # axial |q|, |r|, |q + r| <= this


def hexes_in_radius(radius: int) -> list[HexCoord]:
    coords = []
    for q in range(-radius, radius + 1):
        for r in range(max(-radius, -q - radius), min(radius, -q + radius) + 1):
            coords.append(HexCoord(q, r))
    return coords


def draw_level0_triangles(ax: plt.Axes, hex_coords: list[HexCoord]) -> None:
    for hex_coord in hex_coords:
        cx, cy = hex_center(hex_coord, BASE_EDGE_LENGTH)
        for sector in range(12):
            o, m, v = sector_corners(sector, BASE_EDGE_LENGTH)
            points = [(cx + o[0], cy + o[1]), (cx + m[0], cy + m[1]), (cx + v[0], cy + v[1]), (cx + o[0], cy + o[1])]
            xs, ys = zip(*points)
            color = "0.35" if sector % 2 == 0 else "0.65"
            ax.plot(xs, ys, color=color, linewidth=0.6)


def overlay_level_centers(ax: plt.Axes, level: int, hex_coords: list[HexCoord], marker: str, color: str, label: str) -> None:
    edge_length = level_edge_length(BASE_EDGE_LENGTH, level)
    rotation = level_rotation(level)
    xs, ys = [], []
    for hex_coord in hex_coords:
        canonical = hex_center(hex_coord, edge_length)
        world = rotate(canonical, rotation)
        xs.append(world[0])
        ys.append(world[1])
    ax.scatter(xs, ys, marker=marker, s=14, color=color, label=label, zorder=5)


def print_numeric_verification() -> None:
    print("Numeric alignment residuals (SPEC_002_KRB Section 2 claim):")
    print(f"{'level':>5} {'child_hex':>12} {'(q-r)%3':>8} {'residual':>14}")
    samples = [HexCoord(1, 0), HexCoord(0, 1), HexCoord(2, 2), HexCoord(-3, 3), HexCoord(4, -1)]
    for level in range(4):
        for child_hex in samples:
            residual = level_alignment_residual(BASE_EDGE_LENGTH, level, child_hex)
            residue = (child_hex.q - child_hex.r) % 3
            print(f"{level:>5} {str(child_hex):>12} {residue:>8} {residual:>14.3e}")


def main() -> None:
    hex_coords = hexes_in_radius(GRID_RADIUS)
    fine_hex_coords = hexes_in_radius(GRID_RADIUS * 2)

    fig, ax = plt.subplots(figsize=(8, 8))
    draw_level0_triangles(ax, hex_coords)
    overlay_level_centers(ax, 1, fine_hex_coords, marker="o", color="tab:red", label="level 1 centers")
    overlay_level_centers(ax, 2, fine_hex_coords, marker="^", color="tab:blue", label="level 2 centers")
    ax.set_aspect("equal")
    ax.set_title("Kisrhombille lattice: level 0 mesh with level 1/2 centers overlaid")
    ax.legend(loc="upper right", fontsize=8)
    ax.set_xlim(-GRID_RADIUS * 1.8, GRID_RADIUS * 1.8)
    ax.set_ylim(-GRID_RADIUS * 1.8, GRID_RADIUS * 1.8)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_path = output_dir / "kisrhombille_geometry_check.png"
    fig.savefig(output_path, dpi=200)
    print(f"Saved {output_path}")

    print_numeric_verification()

    # A handful of hexagon vertices, for a sharp-eyed visual cross-check that
    # the overlaid level 1/2 markers above really do sit exactly on them.
    sample_vertices = hex_vertices(HexCoord(0, 0), BASE_EDGE_LENGTH)
    print(f"level-0 origin hex vertices: {sample_vertices}")


if __name__ == "__main__":
    main()
