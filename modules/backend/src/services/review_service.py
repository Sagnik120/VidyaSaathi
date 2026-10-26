"""Spaced review: mastered concepts come back just before they fade.

Schedule per concept lives on the user (review_json). Passing a review pushes
the next one further out (2 -> 5 -> 12 -> 30 -> 60 days); failing brings it back
to 2 days and reopens the concept on the learning path until a newer lesson
masters it again. Review answers never touch lessons, scores or escalations.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from modules.backend.src.db.models import Lesson, User

INTERVALS = [2, 5, 12, 30, 60]
QUESTIONS = 2


class ReviewError(ValueError):
    pass


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _dt(value) -> Optional[datetime]:
    if not value:
        return None
    d = value if isinstance(value, datetime) else datetime.fromisoformat(str(value))
    return d.replace(tzinfo=timezone.utc) if d.tzinfo is None else d


def lapsed_since(entry: Optional[dict], learned_at) -> bool:
    """True if the last review failed after the concept was last learned."""
    lapsed, learned = _dt((entry or {}).get("lapsed")), _dt(learned_at)
    return bool(lapsed and (learned is None or lapsed >= learned))


def _schedule(user: User, mastery: dict) -> dict:
    """Make sure every lesson-mastered concept has a schedule (first review 2 days after learning)."""
    reviews = dict(user.review_json or {})
    changed = False
    new = [cid for cid, m in mastery.items() if m.get("state") == "mastered" and cid not in reviews]
    # Placement can mark dozens known at once: spread those one per day, deepest
    # (most likely to fade) first, instead of making them all due together.
    from modules.backend.src.services import skill_map
    depth = skill_map._depth(skill_map.concepts())
    placed = sorted((c for c in new if mastery[c].get("source") == "placement"), key=lambda c: -depth.get(c, 0))
    stagger = {c: i for i, c in enumerate(placed)}
    for cid in new:
        m = mastery[cid]
        learned = _dt(m.get("learned_at")) or _dt((user.placement_json or {}).get("at")) or _now()
        first = learned + timedelta(days=INTERVALS[0] + stagger.get(cid, 0))
        reviews[cid] = {"interval": INTERVALS[0], "last": learned.isoformat(), "due": first.isoformat(), "lapsed": None}
        changed = True
    if changed:
        user.review_json = reviews
    return reviews


def due(db: Session, user: User) -> list[dict]:
    """Concepts due for review, most overdue first."""
    from modules.backend.src.services import skill_map

    graph = skill_map.concepts()
    mastery = skill_map.mastery(db, user.id, graph)
    reviews = _schedule(user, mastery)
    now, out = _now(), []
    for cid, r in reviews.items():
        m = mastery.get(cid, {})
        if cid not in graph or m.get("state") != "mastered":
            continue  # lapsed concepts are relearned on the path, not reviewed
        when = _dt(r["due"])
        if when and when <= now:
            out.append({"id": cid, "title": graph[cid]["title"], "lesson_id": m.get("lesson_id"),
                        "from_placement": m.get("source") == "placement",
                        "days_since": max(0, (now - _dt(r["last"])).days), "overdue_days": (now - when).days,
                        "interval": r["interval"], "in_progress": bool(r.get("pending"))})
    out.sort(key=lambda x: -x["overdue_days"])
    return out


def start(db: Session, user: User, cid: str) -> dict:
    """Two short questions from the script the learner watched (reused if already started)."""
    item = next((d for d in due(db, user) if d["id"] == cid), None)
    if item is None:
        raise ReviewError("That concept isn't due for review.")
    reviews = dict(user.review_json or {})
    entry = dict(reviews[cid])
    if not entry.get("pending"):
        entry["pending"], entry["answers"] = _questions(db, item, user), {}
        reviews[cid] = entry
        user.review_json = reviews
    return _public(cid, item["title"], entry)


def answer(db: Session, user: User, cid: str, qid: str, text: str) -> dict:
    from modules.backend.src.services.practice_service import check_answer

    reviews = dict(user.review_json or {})
    entry = dict(reviews.get(cid) or {})
    q = next((q for q in entry.get("pending") or [] if q["id"] == qid), None)
    if q is None:
        raise ReviewError("That review question isn't available.")
    if not (text or "").strip():
        raise ReviewError("Type or pick an answer first.")
    correct, feedback = check_answer(q["type"], q["expected_concept"], q["node_id"], text.strip())
    answers = dict(entry.get("answers") or {})
    answers[qid] = correct
    entry["answers"] = answers
    result = {"correct": correct, "feedback_text": feedback, "model_answer": q["expected_concept"], "finished": False}

    if len(answers) == len(entry["pending"]):
        passed = sum(answers.values()) * 2 >= len(answers) + 1   # more than half right
        step = INTERVALS.index(entry["interval"]) if entry["interval"] in INTERVALS else 0
        interval = INTERVALS[min(step + 1, len(INTERVALS) - 1)] if passed else INTERVALS[0]
        now = _now()
        entry.update(interval=interval, last=now.isoformat(), due=(now + timedelta(days=interval)).isoformat(),
                     lapsed=None if passed else now.isoformat(), pending=None, answers={})
        result.update(finished=True, passed=passed, next_in_days=interval)
    reviews[cid] = entry
    user.review_json = reviews
    return result


def _public(cid: str, title: str, entry: dict) -> dict:
    return {"id": cid, "title": title, "questions": [
        {k: q[k] for k in ("id", "question_text", "type", "options")} | {"answered": q["id"] in (entry.get("answers") or {})}
        for q in entry["pending"]]}


def _questions(db: Session, item: dict, user: User) -> list[dict]:
    from modules.ai_agent_orchestration.src.schemas.lesson import LessonNode
    from modules.ai_agent_orchestration.src.schemas.teaching import TeachingSegment
    from modules.backend.src.services import skill_map
    from modules.backend.src.services.session_manager import session_manager

    lesson = db.get(Lesson, item["lesson_id"]) if item.get("lesson_id") else None
    graph = skill_map.concepts()
    questioner = session_manager._ai.orchestrator.questioner
    if lesson is None:
        return _concept_questions(item, graph, user, questioner)
    rows = [n for n in lesson.nodes if n.script_text]
    # The nodes that taught this concept; a lesson tagged with it covers all its nodes.
    mine = [n for n in rows if lesson.skill_concept_id == item["id"] or skill_map.match_concept(n.concept, graph) == item["id"]]
    rows = (mine or rows)[:QUESTIONS]
    if not rows:
        return _concept_questions(item, graph, user, questioner)
    out = []
    for i in range(QUESTIONS):
        row = rows[i % len(rows)]
        node = LessonNode(node_id=row.node_id, concept=row.concept, depth=row.depth, est_minutes=row.est_minutes,
                          visual_type=row.visual_type, checkpoint_question=True)
        segment = TeachingSegment(node_id=row.node_id, script_text=row.script_text, language=lesson.language or "en",
                                  visual_spec=row.visual_json or {"type": row.visual_type or "diagram", "content": row.concept},
                                  avatar_cue="neutral", notes=row.notes_json or None)
        ev = questioner.generate_question(node, segment, difficulty=lesson.difficulty)
        out.append({"id": "r" + uuid.uuid4().hex[:15], "node_id": row.node_id, "question_text": ev.question_text,
                    "type": ev.type, "options": list(ev.options or []), "expected_concept": ev.expected_concept})
    return out


def _concept_questions(item: dict, graph: dict, user: User, questioner) -> list[dict]:
    """No lesson taught it (known from placement): ask about the concept's core
    idea, described from the map, at the learner's placement level."""
    from modules.ai_agent_orchestration.src.schemas.lesson import LessonNode
    from modules.ai_agent_orchestration.src.schemas.teaching import TeachingSegment

    c = graph[item["id"]]
    pre = ", ".join(graph[p]["title"] for p in c["prereqs"] if p in graph)
    script = (f"Review of {c['title']}: a core idea in AI that builds on {pre}. "
              if pre else f"Review of {c['title']}: a foundational idea in AI. ")
    script += "The questions check the main idea, why it matters, and a simple example of it."
    level = (user.placement_json or {}).get("difficulty")
    node = LessonNode(node_id=f"review_{item['id']}", concept=c["title"], depth="core", est_minutes=2,
                      visual_type="diagram", checkpoint_question=True)
    segment = TeachingSegment(node_id=node.node_id, script_text=script, language=user.preferred_language or "en",
                              visual_spec={"type": "diagram", "content": c["title"]}, avatar_cue="neutral", notes=None)
    out = []
    for _ in range(QUESTIONS):
        ev = questioner.generate_question(node, segment, difficulty=level)
        out.append({"id": "r" + uuid.uuid4().hex[:15], "node_id": node.node_id, "question_text": ev.question_text,
                    "type": ev.type, "options": list(ev.options or []), "expected_concept": ev.expected_concept})
    return out
