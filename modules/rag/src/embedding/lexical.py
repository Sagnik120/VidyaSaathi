"""Dependency-free lexical embedding adapter for small free hosts.

Feature-hashes word unigrams/bigrams into a fixed-size unit vector, so there is
no model download and no torch/sentence-transformers in memory (~0 MB extra).
Retrieval quality is keyword-level rather than semantic; the hybrid sparse
(BM25-style) signal and lexical reranker still apply on top of it.
"""

from __future__ import annotations

import math
import re
import zlib
from typing import Dict, List, Tuple

from modules.rag.src.embedding.base import BaseEmbeddingAdapter

_DIM = 256
_TOKEN = re.compile(r"[^\s.,;:!?()\[\]{}\"'“”‘’।|/\\]+")


def _tokens(text: str) -> List[str]:
    return [t for t in _TOKEN.findall(text.lower()) if t]


class LexicalEmbeddingAdapter(BaseEmbeddingAdapter):
    model_name = "lexical-hash-256"

    def _dense(self, text: str) -> List[float]:
        words = _tokens(text)
        vec = [0.0] * _DIM
        for feat in words + [f"{a} {b}" for a, b in zip(words, words[1:])]:
            h = zlib.crc32(feat.encode("utf-8"))
            vec[h % _DIM] += -1.0 if (h >> 16) & 1 else 1.0
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    @staticmethod
    def _sparse(text: str) -> Dict[str, float]:
        tf: Dict[str, float] = {}
        for w in _tokens(text):
            tf[w] = tf.get(w, 0.0) + 1.0
        return tf

    def embed_passages(self, texts: List[str]) -> Tuple[List[List[float]], List[Dict[str, float]]]:
        return [self._dense(t) for t in texts], [self._sparse(t) for t in texts]

    def embed_query(self, query: str) -> Tuple[List[float], Dict[str, float]]:
        return self._dense(query), {w: 1.0 for w in _tokens(query)}
