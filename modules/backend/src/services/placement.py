"""Placement check: ~6 adaptive multiple-choice questions over a fixed bank of
anchor concepts (easy -> hard). Stateless: the client sends every answer so far,
the server grades them and returns the next question or the result. Answers
never leave the server.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

MAX_QUESTIONS = 6

# (anchor concept id, question, options, index of the correct option), easiest first.
BANK: list[tuple[str, str, list[str], int]] = [
    ("what_is_ml", "What does a machine learning model learn from?",
     ["Hand-written rules for every case", "Examples (data)", "Random guesses only", "The internet in real time"], 1),
    ("data_features", "In a dataset predicting house prices, the price is the…",
     ["Feature", "Label", "Hyperparameter", "Layer"], 1),
    ("linear_regression", "Linear regression predicts a number by…",
     ["Sorting the inputs", "A weighted sum of inputs plus a bias", "Counting categories", "Drawing a decision tree"], 1),
    ("loss_functions", "A loss function measures…",
     ["How long training takes", "How wrong the predictions are", "How many features exist", "The model's file size"], 1),
    ("gradient_descent", "In gradient descent, the learning rate controls…",
     ["The number of features", "How big each update step is", "Which loss to use", "The size of the test set"], 1),
    ("overfitting", "A model scores 99% on training data but 60% on new data. Most likely it is…",
     ["Underfitting", "Overfitting", "Perfectly generalised", "Using too little data augmentation on the test set"], 1),
    ("mlp", "Why do neural networks need non-linear activation functions?",
     ["To train faster on GPUs", "Without them, stacked layers collapse into one linear function",
      "To reduce the number of weights", "To make outputs positive"], 1),
    ("backprop", "Backpropagation computes gradients mainly by applying…",
     ["Bayes' theorem", "The chain rule", "Random search", "Matrix inversion"], 1),
    ("embeddings", "Word embeddings place words so that…",
     ["Alphabetical order is kept", "Similar meanings are close together", "Every word is equally distant", "Longer words get bigger vectors"], 1),
    ("attention", "In attention, each token's output is…",
     ["Its own embedding unchanged", "A weighted mix of values, weighted by query-key similarity",
      "The average of all tokens equally", "The most frequent token"], 1),
    ("transformer", "Compared with RNNs, transformers mainly…",
     ["Process tokens one at a time", "Process all positions in parallel with self-attention",
      "Need no training data", "Cannot handle long text at all"], 1),
    ("llm_pretraining", "GPT-style models are pre-trained to…",
     ["Classify images", "Predict the next token", "Sort documents", "Translate only English to French"], 1),
]
_INDEX = {cid: i for i, (cid, *_rest) in enumerate(BANK)}


def _shown(i: int) -> tuple[list[str], int]:
    """Options as displayed (rotated per question so the key isn't always B) and the key's index."""
    _, _, options, key = BANK[i]
    k = (i * 3 + 1) % len(options)
    rotated = options[k:] + options[:k]
    return rotated, (key - k) % len(options)


def _public(i: int, asked: int) -> dict:
    cid, q, _, _ = BANK[i]
    return {"id": cid, "question": q, "options": _shown(i)[0], "number": asked + 1, "of": MAX_QUESTIONS}


def step(answers: list[dict]) -> dict:
    """answers: [{"id": anchor id, "choice": option index}] in the order asked.
    Binary search over the bank: right -> harder, wrong -> easier."""
    lo, hi = 0, len(BANK) - 1
    graded, best = [], -1
    for a in answers[:MAX_QUESTIONS]:
        i = _INDEX.get(a.get("id"))
        if i is None or lo > hi or i != (lo + hi) // 2:
            raise ValueError("Answers don't match the questions asked.")
        right = a.get("choice") == _shown(i)[1]
        graded.append(right)
        if right:
            best, lo = max(best, i), i + 1
        else:
            hi = i - 1
    if len(graded) < MAX_QUESTIONS and lo <= hi:
        return {"done": False, "next": _public((lo + hi) // 2, len(graded))}
    return {"done": True, "known_upto": BANK[best][0] if best >= 0 else None, "correct": sum(graded), "asked": len(graded)}


def result(answers: list[dict], graph: dict) -> dict:
    """Final placement: every anchor up to the highest one answered right, plus
    all their prerequisites, counts as known."""
    from modules.backend.src.services import skill_map

    outcome = step(answers)
    if not outcome["done"]:
        raise ValueError("Placement isn't finished yet.")
    upto = outcome["known_upto"]
    anchors = [cid for cid, *_ in BANK[: _INDEX[upto] + 1]] if upto else []
    known = skill_map._ancestors(anchors, graph) if anchors else []
    share = (_INDEX[upto] + 1) / len(BANK) if upto else 0
    level = 2 if share < 0.34 else 3 if share < 0.75 else 4
    return {"known": known, "difficulty": level, "known_upto": upto,
            "at": datetime.now(timezone.utc).isoformat()}


def known_set(placement: Optional[dict]) -> set[str]:
    return set((placement or {}).get("known") or [])
