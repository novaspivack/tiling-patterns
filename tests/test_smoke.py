"""Smoke tests."""

import numpy as np

import tiling_patterns
from tiling_patterns.grid import empty_grid, random_grid


def test_version() -> None:
    assert tiling_patterns.__version__


def test_empty_grid() -> None:
    g = empty_grid(4, 6)
    assert g.shape == (4, 6)
    assert g.dtype == np.uint8
    assert g.sum() == 0


def test_random_grid_density() -> None:
    rng = np.random.default_rng(0)
    g = random_grid(100, 100, 0.5, rng)
    assert 0.35 < g.mean() < 0.65
