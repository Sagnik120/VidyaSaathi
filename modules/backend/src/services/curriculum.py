"""The board syllabus as a learning path: subjects -> chapters -> topics.

Everything here is deterministic: a (board, class) pair always yields the same
tree with the same ids, in textbook order, and "next" is always the first
unfinished topic in that order. Progress lives in TopicProgress rows.
"""
import re
from functools import lru_cache
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.backend.src.db.models import Lesson, TopicProgress, User, utcnow
from modules.backend.src.services.syllabus_data import SYLLABUS

BOARDS = ("CBSE", "ICSE")
GRADES = ("6", "7", "8", "9", "10")
# A topic counts as done once its lesson is completed (or the student marks it).
PASS_SCORE = 0.0


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:40]


def normalise(board: Optional[str], grade: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    b = (board or "").strip().upper()
    g = re.sub(r"\D", "", grade or "")
    return (b if b in BOARDS else None, g if g in GRADES else None)


@lru_cache(maxsize=None)
def tree(board: str, grade: str) -> tuple:
    """The syllabus for one class: a tuple of subject dicts (cached, never mutated)."""
    subjects = []
    for subject, chapters in SYLLABUS.get(board, {}).get(grade, {}).items():
        sid = f"{board}-{grade}-{_slug(subject)}"
        chs = []
        for ci, line in enumerate(chapters, start=1):
            title, _, topics = line.partition("|")
            cid = f"{sid}-c{ci}"
            chs.append({
                "id": cid,
                "number": ci,
                "title": title.strip(),
                "topics": [
                    {"id": f"{cid}-t{ti}", "number": f"{ci}.{ti}", "title": t.strip()}
                    for ti, t in enumerate(topics.split(";"), start=1) if t.strip()
                ],
            })
        subjects.append({"id": sid, "name": subject, "chapters": chs})
    return tuple(subjects)


@lru_cache(maxsize=None)
def _index() -> dict:
    """topic id -> (board, grade, subject, chapter, topic) for every class."""
    out = {}
    for board in BOARDS:
        for grade in GRADES:
            for s in tree(board, grade):
                for c in s["chapters"]:
                    for t in c["topics"]:
                        out[t["id"]] = (board, grade, s, c, t)
    return out


def find_topic(topic_id: Optional[str]) -> Optional[tuple]:
    return _index().get(topic_id or "")


def subjects_for(board: Optional[str], grade: Optional[str]) -> list[str]:
    b, g = normalise(board, grade)
    return [s["name"] for s in tree(b, g)] if b and g else []


def _lesson_states(db: Session, user: User) -> dict:
    """Lessons started from the syllabus: topic id -> latest lesson."""
    rows = db.scalars(
        select(Lesson).where(Lesson.user_id == user.id, Lesson.syllabus_topic_id.is_not(None))
        .order_by(Lesson.created_at)
    ).all()
    return {l.syllabus_topic_id: l for l in rows}


def sync_progress(db: Session, user: User) -> dict:
    """Bring TopicProgress up to date with lesson outcomes; return topic id -> row."""
    rows = {r.topic_id: r for r in db.scalars(select(TopicProgress).where(TopicProgress.user_id == user.id)).all()}
    for topic_id, lesson in _lesson_states(db, user).items():
        row = rows.get(topic_id)
        if row is None:
            row = start_topic(db, user, topic_id, lesson.id)
            if row is None:
                continue
            rows[topic_id] = row
        row.lesson_id = lesson.id
        if lesson.status == "completed" and row.status != "completed":
            row.status = "completed"
            row.completed_at = lesson.completed_at or utcnow()
            if lesson.report is not None:
                row.score = round(lesson.report.score_pct / 100.0, 3)
    db.flush()
    return rows


def start_topic(db: Session, user: User, topic_id: str, lesson_id: Optional[str] = None) -> Optional[TopicProgress]:
    found = find_topic(topic_id)
    if not found:
        return None
    board, grade, subject, chapter, _ = found
    row = db.scalars(select(TopicProgress).where(TopicProgress.user_id == user.id, TopicProgress.topic_id == topic_id)).first()
    if row is None:
        row = TopicProgress(
            user_id=user.id, topic_id=topic_id, board=board, grade=grade,
            subject=subject["name"], chapter_id=chapter["id"], status="started", lesson_id=lesson_id,
        )
        db.add(row)
    elif lesson_id:
        row.lesson_id = lesson_id
    db.flush()
    return row


def complete_topic(db: Session, user: User, topic_id: str, done: bool = True) -> Optional[TopicProgress]:
    row = start_topic(db, user, topic_id)
    if row is None:
        return None
    row.status = "completed" if done else "started"
    row.completed_at = utcnow() if done else None
    db.flush()
    return row


def path(db: Session, user: User, board: Optional[str] = None, grade: Optional[str] = None) -> dict:
    """The whole class syllabus with the student's state on every node."""
    b, g = normalise(board or user.board, grade or user.grade)
    if not b or not g:
        return {"board": b, "grade": g, "subjects": [], "configured": False}
    rows = sync_progress(db, user)
    lessons = _lesson_states(db, user)
    from modules.backend.src.db.models import DoubtThread

    stuck = {d.syllabus_topic_id for d in db.scalars(select(DoubtThread).where(
        DoubtThread.student_id == user.id, DoubtThread.kind == "doubt",
        DoubtThread.status != "resolved", DoubtThread.syllabus_topic_id.is_not(None))).all()}

    subjects = []
    for s in tree(b, g):
        chapters = []
        s_done = s_total = 0
        next_topic = None
        for c in s["chapters"]:
            topics = []
            for t in c["topics"]:
                row = rows.get(t["id"])
                lesson = lessons.get(t["id"])
                state = row.status if row else "not_started"
                topics.append({
                    **t,
                    "state": state,
                    "score": row.score if row else None,
                    "lesson_id": lesson.id if lesson else (row.lesson_id if row else None),
                    "lesson_status": lesson.status if lesson else None,
                    "completed_at": row.completed_at.isoformat() if row and row.completed_at else None,
                })
                if next_topic is None and state != "completed":
                    next_topic = {"id": t["id"], "title": t["title"], "chapter": c["title"]}
            done = sum(1 for t in topics if t["state"] == "completed")
            s_done += done
            s_total += len(topics)
            chapters.append({
                "id": c["id"], "number": c["number"], "title": c["title"], "topics": topics,
                "done": done, "total": len(topics),
                "state": "completed" if done == len(topics) else "started" if any(t["state"] != "not_started" for t in topics) else "not_started",
            })
        # Adaptive: weak or still-doubted topics come back before new ground.
        revise = [
            {"id": t["id"], "title": t["title"], "chapter": c["title"],
             "reason": "doubt" if t["id"] in stuck else "low_score",
             "score": t["score"]}
            for c in chapters for t in c["topics"]
            if t["id"] in stuck or (t["state"] == "completed" and t["score"] is not None and t["score"] < 0.5)
        ][:5]
        # Adaptive pace: how the student has scored in this subject sets the next lesson's level.
        scores = [t["score"] for c in chapters for t in c["topics"] if t["score"] is not None]
        avg = sum(scores) / len(scores) if scores else None
        level = "beginner" if avg is None or avg < 0.55 else "advanced" if avg >= 0.85 and len(scores) >= 3 else "intermediate"
        subjects.append({
            "id": s["id"], "name": s["name"], "chapters": chapters, "revise": revise,
            "avg_score": round(avg * 100) if avg is not None else None, "suggested_level": level,
            "done": s_done, "total": s_total,
            "pct": round(100 * s_done / s_total) if s_total else 0,
            "next": next_topic,
            "started": any(c["state"] != "not_started" for c in chapters),
        })
    total = sum(s["total"] for s in subjects)
    done = sum(s["done"] for s in subjects)
    return {
        "board": b, "grade": g, "configured": True, "subjects": subjects,
        "done": done, "total": total, "pct": round(100 * done / total) if total else 0,
    }


def subject_progress(db: Session, student: User, subject: Optional[str] = None) -> dict:
    """Compact per-subject progress for teacher views."""
    data = path(db, student)
    out = {}
    for s in data["subjects"]:
        if subject and s["name"] != subject:
            continue
        scores = [t["score"] for c in s["chapters"] for t in c["topics"] if t["score"] is not None]
        out[s["name"]] = {
            "done": s["done"], "total": s["total"], "pct": s["pct"],
            "avg_score": round(100 * sum(scores) / len(scores)) if scores else None,
            "next": s["next"]["title"] if s["next"] else None,
            "chapters": [{"title": c["title"], "done": c["done"], "total": c["total"]} for c in s["chapters"]],
        }
    return out


_STOP = {"what", "with", "from", "this", "that", "your", "and", "the", "their", "into", "about", "does", "how", "why", "explain"}


def guess_place(board: Optional[str], grade: Optional[str], text: str) -> Optional[dict]:
    """Best-matching (subject, chapter, topic) in the student's class for free text.

    Lets a doubt from a free-topic lesson still reach the right subject teacher.
    Deterministic: the highest word-overlap wins, ties go to syllabus order.
    """
    b, g = normalise(board, grade)
    if not b or not g or not text:
        return None
    words = {w for w in re.findall(r"[a-z]{4,}", text.lower()) if w not in _STOP}
    best, best_score = None, 0
    for s in tree(b, g):
        for c in s["chapters"]:
            c_words = set(re.findall(r"[a-z]{4,}", c["title"].lower()))
            for t in c["topics"]:
                t_words = set(re.findall(r"[a-z]{4,}", t["title"].lower()))
                score = 2 * len(words & t_words) + len(words & c_words)
                if score > best_score:
                    best, best_score = {"subject": s["name"], "chapter": c["title"], "topic": t["title"], "topic_id": t["id"]}, score
    return best
