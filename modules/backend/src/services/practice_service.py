"""Practice questions: revision with the questions a lesson already asked.

Read-only with respect to learning: attempts go to their own table and never
touch the lesson's interactions, node mastery, score, report, escalation
count or learner profile. Multiple-choice is checked locally for free; a
written answer costs one grading call.
"""
import re
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.backend.src.db.models import Interaction, Lesson, PracticeAttempt


class PracticeError(ValueError):
    pass


def _norm(text: str) -> str:
    text = (text or "").strip().lower()
    text = re.sub(r"^\(?\s*[a-d0-9]\s*[\).:-]\s+", "", text)
    return " ".join(re.sub(r"[^\w\s]", " ", text).split())


def practice_set(db: Session, lesson: Lesson, user_id: str) -> list[dict]:
    """Every graded question in the lesson, once each, wrong ones first."""
    concepts = {n.node_id: n.concept for n in lesson.nodes}
    graded = db.scalars(
        select(Interaction)
        .where(Interaction.lesson_id == lesson.id, Interaction.correct.is_not(None))
        .order_by(Interaction.asked_at.asc())
    ).all()

    attempts = db.scalars(
        select(PracticeAttempt)
        .where(PracticeAttempt.lesson_id == lesson.id, PracticeAttempt.user_id == user_id)
        .order_by(PracticeAttempt.answered_at.asc())
    ).all()
    last_practice = {a.interaction_id: a for a in attempts}

    seen, items = set(), []
    for q in graded:
        key = (q.node_id, _norm(q.question_text))
        if key in seen:
            continue
        seen.add(key)
        practice = last_practice.get(q.id)
        items.append({
            "interaction_id": q.id,
            "node_id": q.node_id,
            "concept": concepts.get(q.node_id, q.node_id),
            "question_text": q.question_text,
            "type": q.question_type,
            "options": list(q.options or []),
            "your_lesson_answer": q.raw_answer,
            "lesson_correct": bool(q.correct),
            "needs_practice": not q.correct,
            "last_practice": None if practice is None else {
                "correct": practice.correct, "answer": practice.answer,
                "answered_at": practice.answered_at.isoformat(),
            },
        })
    # Wrong in the lesson first, then in lesson order.
    items.sort(key=lambda it: (not it["needs_practice"],))
    # Fresh targeted questions (Practice Lab) lead the set.
    extra = []
    for g in (lesson.practice_extra or {}).get("items") or []:
        practice = last_practice.get(g["id"])
        extra.append({
            "interaction_id": g["id"], "node_id": g["node_id"], "concept": g["concept"],
            "question_text": g["question_text"], "type": g["type"], "options": list(g.get("options") or []),
            "your_lesson_answer": None, "lesson_correct": None, "needs_practice": True,
            "generated": True, "difficulty": g.get("difficulty"), "target": g.get("target"),
            "last_practice": None if practice is None else {
                "correct": practice.correct, "answer": practice.answer,
                "answered_at": practice.answered_at.isoformat(),
            },
        })
    return extra + items


GENERATE_MAX = 3


def _generated(lesson: Lesson, qid: str):
    """A Practice Lab question, shaped like an Interaction for grade()."""
    from types import SimpleNamespace

    for g in (lesson.practice_extra or {}).get("items") or []:
        if g["id"] == qid:
            return SimpleNamespace(id=g["id"], lesson_id=lesson.id, node_id=g["node_id"], correct=False,
                                   question_type=g["type"], expected_concept=g["expected_concept"])
    return None


def _targets(db: Session, lesson: Lesson) -> list[tuple]:
    """Weakest graded concepts first, with the level to practise them at:
    one step easier where the learner struggled, one harder as a stretch."""
    from modules.backend.src.services.lesson_service import MASTERY_THRESHOLD

    level = lesson.difficulty or 2
    tags: dict[str, str] = {}
    for q in db.scalars(select(Interaction).where(Interaction.lesson_id == lesson.id,
                                                  Interaction.correct.is_(False))).all():
        if q.misconception_tag:
            tags.setdefault(q.node_id, q.misconception_tag)
    graded = sorted((n for n in lesson.nodes if n.attempts and n.script_text), key=lambda n: n.mastery_score)
    out = []
    for n in graded[:GENERATE_MAX]:
        weak = n.mastery_score < MASTERY_THRESHOLD
        out.append((n, max(1, level - 1) if weak else min(5, level + 1), tags.get(n.node_id)))
    return out


def generate(db: Session, lesson: Lesson) -> list[dict]:
    """New questions for the weakest concepts, grounded in the script the
    learner actually watched. Replaces the previous generated set."""
    import uuid
    from concurrent.futures import ThreadPoolExecutor
    from datetime import datetime, timezone

    from modules.ai_agent_orchestration.src.schemas.lesson import LessonNode
    from modules.ai_agent_orchestration.src.schemas.teaching import TeachingSegment
    from modules.backend.src.services.session_manager import session_manager

    targets = _targets(db, lesson)
    if not targets:
        raise PracticeError("Answer at least one question in this lesson first.")
    questioner = session_manager._ai.orchestrator.questioner
    plan = {n.get("node_id"): n for n in (lesson.plan_json or {}).get("nodes", [])}

    def make(target):
        row, level, tag = target
        node = LessonNode(**{**{"node_id": row.node_id, "concept": row.concept, "depth": row.depth,
                                "est_minutes": row.est_minutes, "visual_type": row.visual_type,
                                "checkpoint_question": True}, **plan.get(row.node_id, {})})
        segment = TeachingSegment(node_id=row.node_id, script_text=row.script_text or "",
                                  language=lesson.language or "en",
                                  visual_spec=row.visual_json or {"type": row.visual_type or "diagram", "content": row.concept},
                                  avatar_cue="neutral", notes=row.notes_json or None)
        ev = questioner.generate_question(node, segment, difficulty=level)
        return {"id": "g" + uuid.uuid4().hex[:31], "node_id": row.node_id, "concept": row.concept,
                "question_text": ev.question_text, "type": ev.type, "options": list(ev.options or []),
                "expected_concept": ev.expected_concept, "difficulty": level, "target": tag}

    with ThreadPoolExecutor(max_workers=len(targets)) as pool:
        made = [m for m in pool.map(_safe(make), targets) if m]
    if not made:
        raise PracticeError("Couldn't make new questions right now. Try again in a moment.")
    lesson.practice_extra = {"items": made, "at": datetime.now(timezone.utc).isoformat()}
    db.flush()
    return made


def _safe(fn):
    def run(arg):
        try:
            return fn(arg)
        except Exception:  # one failed question shouldn't sink the others
            import logging
            logging.getLogger(__name__).exception("Practice question generation failed")
            return None
    return run


def check_answer(qtype: str, expected: str, node_id: str, answer: str) -> tuple[bool, str]:
    """Multiple-choice is checked locally; anything written costs one grading call."""
    if qtype == "mcq":
        correct = _norm(answer) == _norm(expected)
        return correct, "Correct!" if correct else "Not quite."
    from modules.ai_agent_orchestration.src.schemas.interaction import StudentResponse
    from modules.backend.src.integrations.container import services

    result = services["ml_core_service"].evaluator.evaluate(
        StudentResponse(node_id=node_id, raw_answer=answer, response_type=qtype, response_time_sec=0.0),
        expected,
    )
    return bool(result.correct), result.feedback_text or ""


def grade(db: Session, lesson: Lesson, user_id: str, interaction_id: str, answer: str) -> dict:
    question = _generated(lesson, interaction_id) or db.get(Interaction, interaction_id)
    if question is None or question.lesson_id != lesson.id or question.correct is None:
        raise PracticeError("That question isn't available for practice.")
    answer = (answer or "").strip()
    if not answer:
        raise PracticeError("Type or pick an answer first.")

    correct, feedback = check_answer(question.question_type, question.expected_concept, question.node_id, answer)
    model_answer = question.expected_concept

    db.add(PracticeAttempt(user_id=user_id, lesson_id=lesson.id, interaction_id=question.id,
                           answer=answer[:4000], correct=correct, feedback_text=feedback))
    db.flush()
    return {"correct": correct, "feedback_text": feedback, "model_answer": model_answer}
