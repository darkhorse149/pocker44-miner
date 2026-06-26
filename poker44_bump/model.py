"""Poker44 'bump' model: proven signature-collision features + averaged tree
ensemble + a CLIFF-ROBUST conformal head.

The conformal head maps the raw ensemble bot-probability `p` to a final risk
score that crosses 0.5 exactly at a calibrated threshold `T`, where `T` sits
just above the worst recent human score plus a drift buffer. This keeps
chunk-level FPR below the validator's 10% cliff under date-to-date drift while
preserving ranking (AP is invariant to this monotone map).

Inference convention matches the reference miner: `chunk_features` is applied
DIRECTLY to the incoming (already validator-sanitized) chunk.
"""
from __future__ import annotations
from typing import Any, Dict, List, Sequence
import numpy as np

from poker44_bump.features import chunk_features
from poker44_bump.features_ext import chunk_features_ext


def conformal_map(p: float | np.ndarray, T: float, lo: float = 0.02, hi: float = 0.98):
    """Monotone map: p==T -> 0.5; p<T -> [lo,0.5); p>T -> (0.5,hi]. Preserves AP."""
    p = np.clip(np.asarray(p, dtype=np.float64), 0.0, 1.0)
    T = float(min(max(T, 1e-4), 1.0 - 1e-4))
    below = 0.5 * (p / T)
    above = 0.5 + 0.5 * (p - T) / (1.0 - T)
    out = np.where(p >= T, above, below)
    return np.clip(out, lo, hi)


class BumpModel:
    """Picklable inference object. Stored fields are plain ensemble + conformal head."""

    def __init__(
        self,
        base_models: Sequence[Any],
        feature_names: Sequence[str],
        threshold: float,
        metadata: Dict[str, Any] | None = None,
        lo: float = 0.02,
        hi: float = 0.98,
    ) -> None:
        self.base_models = list(base_models)
        self.feature_names = list(feature_names)
        self.threshold = float(threshold)
        self.lo = float(lo)
        self.hi = float(hi)
        self.metadata = dict(metadata or {})

    # ---- feature path ----
    def _row(self, chunk: List[dict]) -> np.ndarray:
        extractor = chunk_features_ext if self.metadata.get("feature_set") == "ext" else chunk_features
        feats = extractor(chunk) if chunk else {"hand_count": 0.0}
        return np.array([float(feats.get(n, 0.0)) for n in self.feature_names], dtype=np.float64)

    def feature_matrix(self, chunks: Sequence[List[dict]]) -> np.ndarray:
        if not chunks:
            return np.zeros((0, len(self.feature_names)), dtype=np.float64)
        return np.vstack([self._row(list(c or [])) for c in chunks])

    # ---- scoring ----
    def predict_raw(self, chunks: Sequence[List[dict]]) -> np.ndarray:
        X = self.feature_matrix(chunks)
        if X.shape[0] == 0:
            return np.zeros((0,), dtype=np.float64)
        cols = []
        for m in self.base_models:
            proba = np.asarray(m.predict_proba(X))
            cols.append(proba[:, 1] if proba.ndim == 2 else proba)
        return np.mean(np.vstack(cols), axis=0)

    def predict_chunk_scores(self, chunks: Sequence[List[dict]]) -> List[float]:
        raw = self.predict_raw(chunks)
        final = conformal_map(raw, self.threshold, self.lo, self.hi)
        return [float(v) for v in final]

    def score_chunk(self, chunk: List[dict]) -> float:
        return self.predict_chunk_scores([chunk])[0]

    # diagnostics hook used by the reference miner (optional)
    def debug_score_components(self, chunks: Sequence[List[dict]]) -> Dict[str, List[float]]:
        raw = self.predict_raw(chunks)
        return {"raw_bot_prob": [float(v) for v in raw]}
