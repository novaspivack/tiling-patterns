"""Grid input validation."""

import numpy as np
import pytest

from tiling_patterns.grid import empty_grid, random_grid


def test_empty_grid_rejects_nonpositive() -> None:
    with pytest.raises(ValueError, match="positive"):
        empty_grid(0, 5)


def test_random_grid_rejects_bad_density() -> None:
    rng = np.random.default_rng(0)
    with pytest.raises(ValueError, match="density"):
        random_grid(4, 4, 1.5, rng)
