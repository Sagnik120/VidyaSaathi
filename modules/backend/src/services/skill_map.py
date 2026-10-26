"""AI skill map: a prerequisite graph of AI concepts, per-learner mastery taken
from existing lesson results, goal-driven routes, and LLM-assisted growth.

Read-only over lessons: nothing here changes how lessons are planned or taught.
New concepts added by learners persist in data/skill_map_custom.json.
"""

from __future__ import annotations

import json
import logging
import os
import re
import tempfile
import threading
from pathlib import Path
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.backend.src.db.models import Lesson, LessonNodeRow

logger = logging.getLogger(__name__)

TRACKS = [
    ("math", "Math foundations"),
    ("ml", "Classical ML"),
    ("dl", "Deep learning"),
    ("nlp", "Language & transformers"),
    ("gen", "Generative AI"),
    ("frontier", "Frontier"),
]

# (id, title, track, prerequisites, match keywords)
_CORE: list[tuple[str, str, str, list[str], list[str]]] = [
    # math
    ("vectors", "Vectors & matrices", "math", [], ["vector", "matrix", "matrices", "linear algebra"]),
    ("dot_product", "Dot product & similarity", "math", ["vectors"], ["dot product", "cosine similarity"]),
    ("matrix_mult", "Matrix multiplication", "math", ["vectors"], ["matrix multiplication", "matmul"]),
    ("eigen", "Eigenvectors & SVD", "math", ["matrix_mult"], ["eigen", "svd", "singular value"]),
    ("derivatives", "Derivatives", "math", [], ["derivative", "differentiation", "slope"]),
    ("chain_rule", "Chain rule & partial derivatives", "math", ["derivatives"], ["chain rule", "partial derivative"]),
    ("gradients", "Gradients", "math", ["chain_rule", "vectors"], ["gradient vector"]),
    ("probability", "Probability basics", "math", [], ["probability", "random variable"]),
    ("distributions", "Probability distributions", "math", ["probability"], ["distribution", "gaussian", "normal distribution", "bernoulli"]),
    ("bayes", "Bayes' theorem", "math", ["probability"], ["bayes", "conditional probability", "posterior"]),
    ("statistics", "Mean, variance & statistics", "math", ["probability"], ["variance", "statistics", "standard deviation", "mean"]),
    ("info_theory", "Entropy & information theory", "math", ["distributions"], ["entropy", "kl divergence", "information theory"]),
    ("optimization", "Optimisation basics", "math", ["gradients"], ["optimisation", "optimization", "convex", "minimum"]),
    # classical ML
    ("what_is_ml", "What is machine learning?", "ml", [], ["what is ai", "machine learning", "what is ml", "artificial intelligence"]),
    ("data_features", "Data, features & labels", "ml", ["what_is_ml"], ["feature", "label", "dataset"]),
    ("linear_regression", "Linear regression", "ml", ["data_features", "vectors"], ["linear regression", "regression"]),
    ("loss_functions", "Loss functions", "ml", ["linear_regression"], ["loss function", "loss", "mean squared error", "mse", "cross-entropy"]),
    ("gradient_descent", "Gradient descent", "ml", ["loss_functions", "gradients"], ["gradient descent", "learning rate", "sgd"]),
    ("logistic_regression", "Logistic regression", "ml", ["linear_regression", "probability"], ["logistic regression", "sigmoid", "classification"]),
    ("train_test", "Train/validation/test splits", "ml", ["data_features"], ["train test", "validation set", "test set", "cross-validation"]),
    ("overfitting", "Overfitting & generalisation", "ml", ["train_test", "loss_functions"], ["overfit", "underfit", "generali", "bias-variance"]),
    ("regularization", "Regularisation", "ml", ["overfitting"], ["regulari", "l1", "l2", "weight decay"]),
    ("metrics", "Evaluation metrics", "ml", ["train_test"], ["accuracy", "precision", "recall", "f1", "roc", "confusion matrix"]),
    ("decision_trees", "Decision trees", "ml", ["data_features"], ["decision tree"]),
    ("ensembles", "Random forests & boosting", "ml", ["decision_trees", "overfitting"], ["random forest", "boosting", "xgboost", "ensemble"]),
    ("svm", "Support vector machines", "ml", ["logistic_regression", "dot_product"], ["svm", "support vector"]),
    ("knn", "k-nearest neighbours", "ml", ["data_features", "dot_product"], ["knn", "nearest neighbo"]),
    ("clustering", "Clustering (k-means)", "ml", ["data_features", "statistics"], ["cluster", "k-means", "kmeans"]),
    ("pca", "Dimensionality reduction (PCA)", "ml", ["eigen", "statistics"], ["pca", "dimensionality reduction", "principal component"]),
    # deep learning
    ("perceptron", "Neurons & perceptrons", "dl", ["linear_regression"], ["perceptron", "neuron"]),
    ("activations", "Activation functions", "dl", ["perceptron"], ["activation", "relu", "tanh", "softmax"]),
    ("mlp", "Neural networks (MLPs)", "dl", ["activations", "matrix_mult"], ["neural network", "multilayer", "mlp", "hidden layer"]),
    ("backprop", "Backpropagation", "dl", ["mlp", "chain_rule", "gradient_descent"], ["backprop"]),
    ("optimizers", "Optimisers (Momentum, Adam)", "dl", ["gradient_descent"], ["adam", "momentum", "optimizer", "optimiser", "rmsprop"]),
    ("init_norm", "Initialisation & normalisation", "dl", ["backprop"], ["batch norm", "layer norm", "normalization", "normalisation", "initiali"]),
    ("dropout", "Dropout", "dl", ["regularization", "mlp"], ["dropout"]),
    ("cnn", "Convolutional networks (CNNs)", "dl", ["mlp"], ["cnn", "convolution", "image classification"]),
    ("rnn", "Recurrent networks (RNNs)", "dl", ["mlp"], ["rnn", "recurrent"]),
    ("lstm", "LSTMs & GRUs", "dl", ["rnn"], ["lstm", "gru", "vanishing gradient"]),
    ("resnet", "Residual connections", "dl", ["cnn", "init_norm"], ["resnet", "residual", "skip connection"]),
    ("transfer", "Transfer learning & fine-tuning", "dl", ["cnn"], ["transfer learning", "fine-tun", "pretrained"]),
    # language & transformers
    ("tokenization", "Tokenisation", "nlp", ["what_is_ml"], ["token", "bpe", "wordpiece"]),
    ("embeddings", "Embeddings & word vectors", "nlp", ["dot_product", "tokenization"], ["embedding", "word2vec", "word vector"]),
    ("seq2seq", "Sequence-to-sequence models", "nlp", ["lstm", "embeddings"], ["seq2seq", "encoder-decoder", "machine translation"]),
    ("attention", "Attention", "nlp", ["seq2seq", "dot_product", "activations"], ["attention"]),
    ("self_attention", "Self-attention & multi-head", "nlp", ["attention", "matrix_mult"], ["self-attention", "multi-head", "query key value"]),
    ("transformer", "The Transformer", "nlp", ["self_attention", "resnet", "init_norm"], ["transformer"]),
    ("positional", "Positional encoding", "nlp", ["transformer"], ["positional encoding", "rope", "rotary"]),
    ("bert", "Encoder models (BERT)", "nlp", ["transformer"], ["bert", "masked language"]),
    ("gpt", "Decoder models (GPT)", "nlp", ["transformer"], ["gpt", "decoder-only", "autoregressive"]),
    ("llm_pretraining", "LLM pre-training & scaling", "nlp", ["gpt", "info_theory"], ["pre-training", "pretraining", "scaling law", "large language model", "llm"]),
    ("prompting", "Prompting & in-context learning", "nlp", ["llm_pretraining"], ["prompt", "few-shot", "in-context", "chain of thought"]),
    # generative
    ("autoencoders", "Autoencoders", "gen", ["mlp"], ["autoencoder"]),
    ("vae", "Variational autoencoders", "gen", ["autoencoders", "distributions", "info_theory"], ["vae", "variational"]),
    ("gan", "GANs", "gen", ["mlp", "loss_functions"], ["gan", "generative adversarial"]),
    ("diffusion", "Diffusion models", "gen", ["vae", "distributions"], ["diffusion", "denoising", "stable diffusion"]),
    ("instruction_tuning", "Instruction tuning", "gen", ["llm_pretraining", "transfer"], ["instruction tun", "sft", "supervised fine"]),
    ("rlhf", "RLHF & preference tuning", "gen", ["instruction_tuning", "rl_basics"], ["rlhf", "dpo", "preference", "reward model"]),
    ("rl_basics", "Reinforcement learning basics", "gen", ["probability", "optimization"], ["reinforcement learning", "q-learning", "policy", "reward"]),
    ("multimodal", "Multimodal models (vision-language)", "gen", ["transformer", "cnn"], ["multimodal", "vision-language", "clip", "vlm"]),
    # frontier
    ("lora", "LoRA & efficient fine-tuning", "frontier", ["instruction_tuning", "eigen"], ["lora", "qlora", "peft", "adapter"]),
    ("quantization", "Quantisation & efficient inference", "frontier", ["llm_pretraining"], ["quantiz", "quantis", "int8", "int4"]),
    ("moe", "Mixture of Experts", "frontier", ["transformer"], ["mixture of experts", "moe"]),
    ("ssm", "State-space models", "frontier", ["rnn", "matrix_mult"], ["state space", "state-space", "s4"]),
    ("mamba", "Mamba", "frontier", ["ssm", "transformer"], ["mamba"]),
    ("long_context", "Long context & efficient attention", "frontier", ["self_attention", "positional"], ["long context", "flash attention", "sparse attention", "kv cache"]),
    ("rag", "Retrieval-augmented generation (RAG)", "frontier", ["embeddings", "prompting"], ["rag", "retrieval", "vector database"]),
    ("agents", "AI agents & tool use", "frontier", ["prompting", "rag"], ["agent", "tool use", "function calling"]),
    ("reasoning_models", "Reasoning models", "frontier", ["prompting", "rlhf"], ["reasoning model", "test-time compute", "o1"]),
    ("evaluation_llm", "Evaluating LLMs", "frontier", ["metrics", "llm_pretraining"], ["benchmark", "llm evaluation", "eval"]),
    ("ai_safety", "AI safety & alignment", "frontier", ["rlhf"], ["safety", "alignment", "hallucination", "jailbreak"]),
]

_CUSTOM_PATH = Path(os.environ.get("SKILL_MAP_CUSTOM_PATH", Path(__file__).resolve().parents[4] / "data" / "skill_map_custom.json"))
_LOCK = threading.Lock()


class NotAITopic(ValueError):
    """The LLM judged the requested topic to be outside AI."""
_TRACK_IDS = {t for t, _ in TRACKS}


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")[:60] or "concept"


def _load_custom() -> list[dict]:
    try:
        data = json.loads(_CUSTOM_PATH.read_text(encoding="utf-8"))
        return [c for c in data if isinstance(c, dict) and c.get("id")]
    except (OSError, ValueError):
        return []


def _save_custom(items: list[dict]) -> None:
    _CUSTOM_PATH.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=_CUSTOM_PATH.parent, suffix=".json")
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        json.dump(items, fh, ensure_ascii=False, indent=1)
    os.replace(tmp, _CUSTOM_PATH)  # atomic: a crash never leaves half a file


def concepts() -> dict[str, dict]:
    out = {
        cid: {"id": cid, "title": title, "track": track, "prereqs": list(pre), "keywords": list(kw), "custom": False}
        for cid, title, track, pre, kw in _CORE
    }
    for c in _load_custom():
        if c["id"] not in out:
            pre = [p for p in c.get("prereqs", []) if p in out]
            out[c["id"]] = {
                "id": c["id"], "title": c.get("title") or c["id"], "track": c.get("track") if c.get("track") in _TRACK_IDS else "frontier",
                "prereqs": pre, "keywords": c.get("keywords") or [c.get("title", "").lower()], "custom": True,
                "summary": c.get("summary", ""),
            }
    return out


def match_concept(text: str, graph: Optional[dict] = None) -> Optional[str]:
    """Best concept for a lesson/node title: the longest keyword it contains."""
    graph = graph or concepts()
    low = f" {(text or '').lower()} "
    best, best_len = None, 0
    for cid, c in graph.items():
        for kw in c["keywords"] + [c["title"].lower()]:
            kw = kw.strip().lower()
            # whole-word-ish match so "gan" doesn't fire inside "organ"
            if kw and len(kw) > best_len and re.search(rf"(?<![a-z]){re.escape(kw)}", low):
                best, best_len = cid, len(kw)
    return best


def mastery(db: Session, user_id: str, graph: dict) -> dict[str, dict]:
    """Per-concept mastery from the learner's graded lesson nodes (best score wins)."""
    from modules.backend.src.services.lesson_service import MASTERY_THRESHOLD

    rows = db.execute(
        select(LessonNodeRow.concept, LessonNodeRow.mastery_score, LessonNodeRow.attempts, Lesson.title, Lesson.topic,
               Lesson.skill_concept_id, Lesson.id, Lesson.status, Lesson.updated_at)
        .join(Lesson, Lesson.id == LessonNodeRow.lesson_id)
        .where(Lesson.user_id == user_id)
    ).all()
    out: dict[str, dict] = {}
    from modules.backend.src.db.models import User
    from modules.backend.src.services.placement import known_set

    user = db.get(User, user_id)
    placed = known_set(user.placement_json if user else None)
    for concept, score, attempts, title, topic, tagged, lesson_id, lesson_status, updated in rows:
        # A lesson started from the map knows its concept; only plain lessons
        # are matched by keywords (which also makes Hindi lessons count).
        cid = tagged if tagged in graph else match_concept(concept, graph) or match_concept(f"{title} {topic or ''}", graph)
        if not cid:
            continue
        cur = out.setdefault(cid, {"score": None, "attempts": 0, "lesson_id": None, "lesson_status": None, "_at": None})
        cur["attempts"] += attempts or 0
        if updated is not None and (cur["_at"] is None or updated > cur["_at"]):
            cur.update(lesson_id=lesson_id, lesson_status=lesson_status, _at=updated)  # latest lesson on it
        if attempts:
            cur["score"] = max(cur["score"] or 0.0, float(score or 0.0))
    for cid, m in out.items():
        at = m.pop("_at", None)
        m["learned_at"] = at.isoformat() if at is not None else None
        s = m["score"]
        m["state"] = "mastered" if s is not None and s >= MASTERY_THRESHOLD else "practice" if s is not None else "started"
    # A failed spaced review reopens a mastered concept until a newer lesson masters it again.
    from modules.backend.src.services.review_service import lapsed_since

    reviews = (user.review_json if user else None) or {}
    for cid, m in out.items():
        if m["state"] == "mastered" and lapsed_since(reviews.get(cid), m.get("learned_at")):
            m["state"], m["lapsed"] = "practice", True
    # Placement marks a concept known only where no lesson has said otherwise:
    # real lesson results always win.
    for cid in placed:
        if cid in graph and cid not in out:
            placed_at = (user.placement_json or {}).get("at")
            lapsed = lapsed_since(reviews.get(cid), placed_at)
            out[cid] = {"score": None, "attempts": 0, "lesson_id": None, "lesson_status": None,
                        "state": "practice" if lapsed else "mastered", "source": "placement",
                        "learned_at": placed_at, **({"lapsed": True} if lapsed else {})}
    return out


COURSE = "__all__"          # goal: the whole map, foundations to frontier
TRACK_PREFIX = "__track_"   # goal: one track, complete (e.g. "__track_dl")


def valid_goal(goal: Optional[str], graph: dict) -> bool:
    if not goal:
        return False
    if goal == COURSE:
        return True
    if goal.startswith(TRACK_PREFIX):
        return goal[len(TRACK_PREFIX):] in _TRACK_IDS
    return goal in graph


def goal_title(goal: str, graph: dict) -> str:
    if goal == COURSE:
        return "AI from zero to frontier"
    if goal.startswith(TRACK_PREFIX):
        return dict(TRACKS)[goal[len(TRACK_PREFIX):]] + " (complete track)"
    return graph[goal]["title"]


def _depth(graph: dict) -> dict[str, int]:
    """Longest prerequisite chain under each concept (0 = no prerequisites)."""
    memo: dict[str, int] = {}

    def d(cid: str, stack: frozenset) -> int:
        if cid not in memo:
            pre = [p for p in graph[cid]["prereqs"] if p in graph and p not in stack]
            memo[cid] = 1 + max((d(p, stack | {cid}) for p in pre), default=-1)
        return memo[cid]

    for cid in graph:
        d(cid, frozenset())
    return memo


def targets(goal: str, graph: dict) -> list[str]:
    """Concepts a goal asks for. Course/track goals are ordered shallow-first
    across tracks, so a beginner meets foundations before depth."""
    if goal == COURSE:
        ids = list(graph)
    elif goal.startswith(TRACK_PREFIX):
        ids = [c for c in graph if graph[c]["track"] == goal[len(TRACK_PREFIX):]]
    else:
        return [goal]
    # Motivation first: "What is ML?" opens the course, then the maths it needs.
    depth, order = _depth(graph), ["ml", "math", "dl", "nlp", "gen", "frontier"]
    return sorted(ids, key=lambda c: (depth[c], order.index(graph[c]["track"])))


def _ancestors(goals: list[str], graph: dict, known: frozenset = frozenset()) -> list[str]:
    """Targets plus every prerequisite, in a valid learning order (prereqs first).
    The walk stops at concepts in `known`: mastering one covers its foundations."""
    order, seen = [], set()

    def visit(cid: str, stack: frozenset) -> None:
        if cid in seen or cid in stack or cid not in graph:
            return
        if cid not in known:
            for p in graph[cid]["prereqs"]:
                visit(p, stack | {cid})
        seen.add(cid)
        order.append(cid)

    for g in goals:
        visit(g, frozenset())
    return order


def route(goal: str, graph: dict, mastered: dict[str, dict]) -> list[dict]:
    known = frozenset(c for c, v in mastered.items() if v.get("state") == "mastered")
    wanted = targets(goal, graph)
    single = len(wanted) == 1
    path = _ancestors(wanted, graph, known)
    steps = []
    for cid in path:
        m = mastered.get(cid, {})
        state = m.get("state")
        if state == "mastered":
            continue
        unmet = [graph[p]["title"] for p in graph[cid]["prereqs"] if mastered.get(p, {}).get("state") != "mastered"]
        if state == "practice" and m.get("lapsed"):
            reason = "Faded since you last used it (missed a refresh). One round of practice."
        elif state == "practice":
            reason = f"You scored {round((m['score'] or 0) * 100)}% here. One more round before moving on."
        elif single and cid == goal:
            reason = "Your goal."
        else:
            users = [graph[c]["title"] for c in graph if cid in graph[c]["prereqs"] and c in path]
            reason = (f"Needed for {users[0]}." if users
                      else "Builds the foundation for your goal." if single else "Next in your course.")
        steps.append({"id": cid, "title": graph[cid]["title"], "track": graph[cid]["track"], "state": state or "new",
                      "reason": reason, "blocked_by": unmet})
    # Failed a concept whose prerequisites all look mastered? The gap is
    # usually in the weakest of them, so recap that one first.
    recaps = []
    for s in steps:
        if s["state"] != "practice":
            continue
        scored = [(mastered[p]["score"], p) for p in graph[s["id"]]["prereqs"]
                  if mastered.get(p, {}).get("state") == "mastered" and mastered[p].get("score") is not None]
        if scored and not s["blocked_by"]:
            score, p = min(scored)
            recaps.append((s["id"], {
                "id": p, "title": graph[p]["title"], "track": graph[p]["track"], "state": "recap", "blocked_by": [],
                "reason": f"Quick recap: {graph[s['id']]['title']} builds on this, and it's your weakest foundation ({round(score * 100)}%).",
            }))
    for before, recap in recaps:
        if all(x["id"] != recap["id"] for x in steps):
            steps.insert(next(i for i, x in enumerate(steps) if x["id"] == before), recap)

    # The first step whose prerequisites are all mastered (or skipped) is "next".
    for s in steps:
        if not s["blocked_by"] or all(b not in {x["title"] for x in steps} for b in s["blocked_by"]):
            s["next"] = True
            break
    return steps


def journey(goal: str, graph: dict, mastered: dict[str, dict], steps: list[dict]) -> list[dict]:
    """The whole path in order: finished steps interleaved with what's left
    (`steps` = route(), recaps included), each linked to its latest lesson."""
    known = frozenset(c for c, v in mastered.items() if v.get("state") == "mastered")
    out, i = [], 0
    for cid in _ancestors(targets(goal, graph), graph, known):
        if cid in known:
            m = mastered[cid]
            out.append({"id": cid, "title": graph[cid]["title"], "track": graph[cid]["track"], "state": "done",
                        "score": m.get("score"), "reason": "", "blocked_by": []})
            continue
        while i < len(steps):  # route steps for this concept (a recap comes first)
            st = steps[i]
            i += 1
            out.append(st)
            if st["id"] == cid and st["state"] != "recap":
                break
    out.extend(steps[i:])
    for item in out:
        m = mastered.get(item["id"], {})
        item["lesson_id"], item["lesson_status"] = m.get("lesson_id"), m.get("lesson_status")
    return out


def path_context(db: Session, user_id: str, concept: Optional[str], goal: Optional[str]) -> Optional[dict]:
    """What the planner should know when this lesson is one step on a route."""
    graph = concepts()
    if concept not in graph:
        return None
    m = mastery(db, user_id, graph)
    pre = graph[concept]["prereqs"]
    goal = goal if valid_goal(goal, graph) else concept
    order = [s["id"] for s in route(goal, graph, m)]
    after = order[order.index(concept) + 1] if concept in order and order.index(concept) + 1 < len(order) else None
    return {
        "concept": graph[concept]["title"],
        "goal": goal_title(goal, graph),
        "mastered_prerequisites": [graph[p]["title"] for p in pre if m.get(p, {}).get("state") == "mastered"],
        "weak_prerequisites": [
            {"concept": graph[p]["title"], "percent": round((m[p]["score"] or 0) * 100)}
            for p in pre if m.get(p, {}).get("state") == "practice"
        ],
        "not_yet_learned": [graph[p]["title"] for p in pre if p not in m],
        "next_on_path": graph[after]["title"] if after else None,
        "previous_attempt_percent": round(m[concept]["score"] * 100) if m.get(concept, {}).get("score") is not None else None,
    }


def _mark_due(items: list[dict], db: Session, user) -> list[dict]:
    """Flag finished steps that are due for a spaced review."""
    try:
        from modules.backend.src.services.review_service import due

        ids = {d["id"] for d in due(db, user)} if user else set()
    except Exception:
        ids = set()
    for it in items:
        it["review_due"] = it["state"] == "done" and it["id"] in ids
    return items


def snapshot(db: Session, user_id: str, goal: Optional[str]) -> dict:
    graph = concepts()
    m = mastery(db, user_id, graph)
    goal = goal if valid_goal(goal, graph) else None
    steps = route(goal, graph, m) if goal else []
    scope = set(_ancestors(targets(goal, graph), graph)) if goal else set()
    from modules.backend.src.db.models import User

    user = db.get(User, user_id)
    return {
        "placement": (user.placement_json if user else None),
        "tracks": [{"id": t, "title": title} for t, title in TRACKS],
        "concepts": [
            {k: c[k] for k in ("id", "title", "track", "prereqs", "custom")} | {"mastery": m.get(cid)}
            for cid, c in graph.items()
        ],
        "goal": goal,
        "goal_title": goal_title(goal, graph) if goal else None,
        "route": steps,
        "journey": _mark_due(journey(goal, graph, m, [dict(x) for x in steps]), db, user) if goal else [],
        # progress toward the goal: concepts in its full scope, and how many are mastered
        "scope_total": len(scope),
        "scope_done": sum(1 for c in scope if m.get(c, {}).get("state") == "mastered"),
        "mastered_count": sum(1 for v in m.values() if v["state"] == "mastered"),
    }


def add_concept(topic: str) -> dict:
    """Place a new AI topic on the map. LLM first; keyword heuristic as fallback."""
    topic = re.sub(r"\s+", " ", (topic or "").strip())[:80]
    if len(topic) < 2:
        raise ValueError("Topic is too short.")
    graph = concepts()
    existing = match_concept(topic, graph)
    if existing and graph[existing]["title"].lower() == topic.lower():
        return graph[existing] | {"existing": True}

    placed = _place_with_llm(topic, graph) or _place_heuristic(topic, graph)
    cid = _slug(placed.get("title") or topic)
    if cid in graph:
        return graph[cid] | {"existing": True}
    item = {
        "id": cid, "title": placed.get("title") or topic, "track": placed.get("track", "frontier"),
        "prereqs": [p for p in placed.get("prereqs", []) if p in graph][:4] or ["transformer"],
        "keywords": [topic.lower()], "summary": placed.get("summary", ""),
    }
    with _LOCK:
        items = _load_custom()
        if not any(c["id"] == cid for c in items):
            items.append(item)
            _save_custom(items)
    return concepts()[cid] | {"existing": False}


def _place_with_llm(topic: str, graph: dict) -> Optional[dict]:
    try:
        from modules.ai_agent_orchestration.src.adapters.gemini_adapter import get_llm_adapter

        catalog = "\n".join(f"{cid}: {c['title']}" for cid, c in graph.items())
        prompt = (
            "You maintain a prerequisite map of AI concepts. Place this new topic on it.\n"
            f"Topic: {topic}\n\nExisting concept ids:\n{catalog}\n\n"
            "Reply with JSON only: {\"is_ai_topic\": true|false, \"title\": short canonical title, "
            f"\"track\": one of {sorted(_TRACK_IDS)}, \"prereqs\": [2-4 existing ids a learner needs first], "
            "\"summary\": one sentence}"
        )
        raw = get_llm_adapter().complete([{"role": "user", "content": prompt}])
        data = json.loads(re.search(r"\{.*\}", raw or "", re.S).group(0))
        if data.get("is_ai_topic") is False:
            raise NotAITopic("That doesn't look like an AI topic.")
        prereqs = [p for p in data.get("prereqs", []) if p in graph]
        if not prereqs:
            return None
        return {"title": str(data.get("title") or topic)[:80], "track": data.get("track"), "prereqs": prereqs,
                "summary": str(data.get("summary") or "")[:240]}
    except NotAITopic:
        raise
    except Exception as exc:  # offline, mock adapter, malformed JSON
        logger.info("Skill map LLM placement unavailable (%s); using heuristic.", exc)
        return None


def _place_heuristic(topic: str, graph: dict) -> dict:
    near = match_concept(topic, graph)
    if near:
        return {"title": topic, "track": graph[near]["track"], "prereqs": [near]}
    return {"title": topic, "track": "frontier", "prereqs": ["transformer"]}
