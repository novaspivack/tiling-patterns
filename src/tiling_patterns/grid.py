"""Grid utilities for tiling-pattern cellular automata."""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

StateGrid = NDArray[np.uint8]


def empty_grid(height: int, width: int) -> StateGrid:
    """Return a zero-initialized state grid."""
    if height < 1 or width < 1:
        raise ValueError(f"grid dimensions must be positive, got {height}x{width}")
    return np.zeros((height, width), dtype=np.uint8)


def random_grid(height: int, width: int, density: float, rng: np.random.Generator) -> StateGrid:
    """Return a random binary grid with given live-cell density in [0, 1]."""
    if not 0.0 <= density <= 1.0:
        raise ValueError(f"density must be in [0, 1], got {density}")
    return (rng.random((height, width)) < density).astype(np.uint8)
