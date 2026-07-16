"""Precomputed Kisrhombille lattice adjacency for the 12-sector-per-hex
fundamental-triangle graph (see `geometry.py`).

Every triangle's 2 in-hex neighbors are always sectors ``(sector - 1) % 12``
and ``(sector + 1) % 12`` in the same hex. Its 3rd (cross-hex) neighbor is
not a simple function of `sector`, so it is committed here as a table,
derived from and verified against `geometry.neighbors` by
`scripts/generate_lattice_tables.py` and `tests/test_lattice.py`. This is the
single source of truth mirrored by `web/js/lattice.js` for the WebGL engine.
"""

from __future__ import annotations

NUM_SECTORS = 12

#: `(dq, dr, target_sector)` for sector `i`'s one cross-hex neighbor.
CROSS_HEX_NEIGHBOR: tuple[tuple[int, int, int], ...] = (
    (1, 0, 5),  # sector 0
    (0, 1, 8),  # sector 1
    (0, 1, 7),  # sector 2
    (-1, 1, 10),  # sector 3
    (-1, 1, 9),  # sector 4
    (-1, 0, 0),  # sector 5
    (-1, 0, 11),  # sector 6
    (0, -1, 2),  # sector 7
    (0, -1, 1),  # sector 8
    (1, -1, 4),  # sector 9
    (1, -1, 3),  # sector 10
    (1, 0, 6),  # sector 11
)
