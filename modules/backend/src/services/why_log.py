"""The "Why?" log: every adaptive decision in a lesson, as structured entries.

Read-only. Built from what is already recorded (agent trace events, the
difficulty log, escalations, skill-map tags); entries carry a `kind` and
`params` so the client can phrase them in the learner's language.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.backend.src.db.models import Escalation, Lesson, LessonEvent

_LEVEL_REASON = {"2 right in a row": "streak", "a missed answer": "miss"}


def _iso(value) -> Optional[str]:
    if value is None:
        return None
    return value.isoformat() if isinstance(value, datetime) else str(value)


def _when(at: Optional[str]) -> datetime:
    from datetime import timezone
    try:
        d = datetime.fromisoformat(at) if at else datetime.min
    except ValueError:
        d = datetime.min
    return d.replace(tzinfo=timezone.utc) if d.tzinfo is None else d.astimezone(timezone.utc)


def build(db: Session, lesson: Lesson) -> list[dict]:
    concept = {n.node_id: n.concept for n in lesson.nodes}
    out: list[dict] = []

    def add(at, kind: str, node_id: Optional[str] = None, **params) -> None:
        out.append({"at": _iso(at), "kind": kind, "node_id": node_id,
                    "concept": concept.get(node_id) if node_id else None, "params": params})

    events = db.scalars(
        select(LessonEvent).where(LessonEvent.lesson_id == lesson.id)
        .order_by(LessonEvent.occurred_at.asc(), LessonEvent.id.asc())
    ).all()

    last_eval: dict[Optional[str], dict] = {}
    for e in events:
        p, t = e.payload or {}, e.event_type
        if t == "agent.memory_read" and (p.get("weak_concepts") or p.get("recurring_misconceptions")):
            add(e.occurred_at, "memory", weak=(p.get("weak_concepts") or [])[:3],
                misconceptions=(p.get("recurring_misconceptions") or [])[:3])
        elif t == "agent.plan_generated":
            add(e.occurred_at, "plan", parts=p.get("node_count"), from_document=bool(p.get("grounded_in_document")),
                used_memory=bool(p.get("used_learner_memory")))
            _add_path(add, db, lesson, e.occurred_at)
        elif t == "agent.retrieval_resolved":
            if p.get("has_sufficient_context") is False:
                add(e.occurred_at, "no_context", e.node_id)
            elif p.get("was_refined"):
                add(e.occurred_at, "refined_search", e.node_id)
        elif t == "agent.answer_evaluated":
            last_eval[e.node_id] = p
        elif t == "agent.adaptation_decided":
            action = (p.get("action") or "").upper()
            if action in ("MODIFY", "REGENERATE", "HUMAN"):
                ev = last_eval.get(e.node_id) or {}
                add(e.occurred_at, f"adapt_{action.lower()}", e.node_id,
                    attempt=p.get("attempts_on_node"), misconception=ev.get("misconception_tag"))
        elif t in ("escalation_continued", "escalation_skipped"):
            add(e.occurred_at, t, e.node_id)

    for change in (lesson.difficulty_state or {}).get("log") or []:
        add(change.get("at"), "level", frm=change.get("from"), to=change.get("to"),
            reason=_LEVEL_REASON.get(change.get("reason"), "other"))

    for esc in db.scalars(select(Escalation).where(Escalation.lesson_id == lesson.id)).all():
        add(esc.opened_at, "mentor", esc.node_id)

    # Timestamps mix naive-UTC rows and aware ISO strings; compare as UTC datetimes.
    out.sort(key=lambda x: _when(x["at"]))
    return out


def _add_path(add, db: Session, lesson: Lesson, at) -> None:
    """Why this lesson looks the way it does on the learner's route."""
    if not lesson.skill_concept_id:
        return
    try:
        from modules.backend.src.services import skill_map

        ctx = skill_map.path_context(db, lesson.user_id, lesson.skill_concept_id, lesson.skill_goal_id)
    except Exception:
        return
    if not ctx:
        return
    add(at, "path", goal=ctx["goal"], skipped=ctx["mastered_prerequisites"][:4],
        recap=[w["concept"] for w in ctx["weak_prerequisites"]][:3] + ctx["not_yet_learned"][:3],
        retry_percent=ctx.get("previous_attempt_percent"), next=ctx.get("next_on_path"))
