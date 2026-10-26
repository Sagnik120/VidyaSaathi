"""Live difficulty: a 1-5 level per lesson, moved by graded answers.

Read-only with respect to grading and the escalation ladder: it consumes the
evaluation they already produced and only changes the level handed to the
explainer and questioner for what is generated next.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.backend.src.db.models import Lesson, User

LEVEL_BASE = {"beginner": 2, "intermediate": 3, "advanced": 4}
UP_AFTER = 2            # correct answers in a row before stepping up
WRONG_CREDIT = 0.5      # same line the adaptation controller uses for "wrong"
MIN_LEVEL, MAX_LEVEL = 1, 5


def _clamp(v: int, lo: int = MIN_LEVEL, hi: int = MAX_LEVEL) -> int:
    return max(lo, min(hi, v))


def starting_level(db: Session, user: User, level: str, exclude_id: Optional[str] = None) -> int:
    """Where a new lesson starts: the learner's last level (or placement), kept
    within one step of the level they chose, so both are respected."""
    base = LEVEL_BASE.get(level, 2)
    last = db.scalars(
        select(Lesson.difficulty)
        .where(Lesson.user_id == user.id, Lesson.difficulty.isnot(None), Lesson.id != (exclude_id or ""))
        .order_by(Lesson.updated_at.desc())
        .limit(1)
    ).first()
    carried = last if last is not None else (user.placement_json or {}).get("difficulty")
    return _clamp(int(carried), base - 1, base + 1) if carried else base


def update(lesson: Lesson, evaluation: Any) -> Optional[dict]:
    """Apply one fresh graded answer. Returns the change, or None if the level stayed."""
    ev = evaluation.model_dump() if hasattr(evaluation, "model_dump") else dict(evaluation or {})
    correct = bool(ev.get("correct"))
    credit = float(ev.get("partial_credit") or 0.0)

    level = lesson.difficulty or LEVEL_BASE.get(lesson.level, 2)
    state = dict(lesson.difficulty_state or {})
    streak = int(state.get("streak", 0))
    new, reason = level, None

    if correct:
        streak += 1
        if streak >= UP_AFTER:
            new, streak = _clamp(level + 1), 0
            reason = f"{UP_AFTER} right in a row"
    elif credit < WRONG_CREDIT:
        new, streak = _clamp(level - 1), 0
        reason = "a missed answer"
    else:
        streak = 0  # partly right: hold steady

    state["streak"] = streak
    change = None
    if new != level and reason:
        change = {"from": level, "to": new, "reason": reason, "at": datetime.now(timezone.utc).isoformat()}
        state["log"] = (state.get("log") or [])[-19:] + [change]
    lesson.difficulty = new
    lesson.difficulty_state = state  # reassigned, so SQLAlchemy sees the JSON change
    return change
