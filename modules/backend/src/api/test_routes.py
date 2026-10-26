"""Teacher-made class tests (MCQ / MSQ), class leaderboards and detailed reports."""
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.backend.src.db.base import get_db
from modules.backend.src.db.models import ClassTest, TestAttempt, User, utcnow
from modules.backend.src.deps import get_current_user
from modules.backend.src.services import curriculum, school

router = APIRouter(prefix="/tests", tags=["tests"])


class QuestionIn(BaseModel):
    text: str = Field(min_length=3, max_length=1000)
    type: Literal["mcq", "msq"] = "mcq"
    options: list[str] = Field(min_length=2, max_length=6)
    answer: list[int] = Field(min_length=1)
    topic: str = Field(default="", max_length=200)
    marks: float = Field(default=1, gt=0, le=10)

    @model_validator(mode="after")
    def _check(self):
        if any(i < 0 or i >= len(self.options) for i in self.answer):
            raise ValueError("An answer points at an option that doesn't exist.")
        if self.type == "mcq" and len(set(self.answer)) != 1:
            raise ValueError("An MCQ has exactly one correct option.")
        return self


class TestIn(BaseModel):
    board: Literal["CBSE", "ICSE"]
    grade: str = Field(pattern=r"^(6|7|8|9|10)$")
    subject: str = Field(max_length=60)
    title: str = Field(min_length=2, max_length=200)
    duration_min: int = Field(default=20, ge=2, le=180)
    due_at: Optional[datetime] = None
    questions: list[QuestionIn] = Field(min_length=1, max_length=100)


def _is_teacher(u: User) -> bool:
    return u.role in ("teacher", "admin")


def _grade(q: dict, picked: list[int]) -> float:
    """MCQ: all or nothing. MSQ: exact set = full marks; a subset with no wrong pick = partial."""
    right, chosen = set(q["answer"]), set(picked or [])
    if chosen == right:
        return float(q["marks"])
    if q["type"] == "msq" and chosen and chosen <= right:
        return round(q["marks"] * len(chosen) / len(right) * 0.5, 2)
    return 0.0


def _test_out(t: ClassTest, reveal: bool, attempt: Optional[TestAttempt] = None, teacher: Optional[User] = None) -> dict:
    qs = [{k: v for k, v in q.items() if reveal or k != "answer"} for q in t.questions]
    return {
        "id": t.id, "board": t.board, "grade": t.grade, "subject": t.subject, "title": t.title,
        "duration_min": t.duration_min, "due_at": t.due_at.isoformat() if t.due_at else None,
        "created_at": t.created_at.isoformat(), "question_count": len(t.questions),
        "max_score": sum(q["marks"] for q in t.questions), "questions": qs,
        "teacher": {"id": teacher.id, "full_name": teacher.full_name} if teacher else None,
        "attempt": ({"score": attempt.score, "max_score": attempt.max_score,
                     "pct": round(100 * attempt.score / attempt.max_score) if attempt.max_score else 0,
                     "submitted_at": attempt.submitted_at.isoformat()} if attempt else None),
    }


def _load(db: Session, test_id: str) -> ClassTest:
    t = db.get(ClassTest, test_id)
    if not t:
        raise HTTPException(status_code=404, detail="Test not found.")
    return t


def _can_see(t: ClassTest, user: User) -> bool:
    if user.role == "admin" or t.teacher_id == user.id:
        return True
    return user.role == "student" and curriculum.normalise(user.board, user.grade) == (t.board, t.grade)


@router.post("")
def create_test(payload: TestIn, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    if not _is_teacher(user):
        raise HTTPException(status_code=403, detail="Only teachers can create tests.")
    if user.role == "teacher" and not school.teaches(user, payload.board, payload.grade, payload.subject):
        raise HTTPException(status_code=403, detail=f"Add {payload.subject} for {payload.board} Class {payload.grade} to your teaching profile first.")
    questions = [{**q.model_dump(), "id": uuid.uuid4().hex[:10], "answer": sorted(set(q.answer))} for q in payload.questions]
    t = ClassTest(teacher_id=user.id, board=payload.board, grade=payload.grade, subject=payload.subject,
                  title=payload.title, duration_min=payload.duration_min, due_at=payload.due_at, questions=questions)
    db.add(t)
    db.flush()
    students = db.scalars(select(User).where(User.role == "student")).all()
    for s in students:
        if curriculum.normalise(s.board, s.grade) == (t.board, t.grade):
            school.notify(db, s.id, "test", f"New {t.subject} test: {t.title}",
                          f"{len(questions)} questions · {t.duration_min} min · by {user.full_name}", f"/tests/{t.id}")
    return _test_out(t, reveal=True, teacher=user)


@router.get("")
def list_tests(user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    if _is_teacher(user):
        q = select(ClassTest) if user.role == "admin" else select(ClassTest).where(ClassTest.teacher_id == user.id)
        tests = db.scalars(q.order_by(ClassTest.created_at.desc())).all()
        out = []
        for t in tests:
            atts = db.scalars(select(TestAttempt).where(TestAttempt.test_id == t.id)).all()
            item = _test_out(t, reveal=True)
            item["attempts"] = len(atts)
            item["avg_pct"] = round(sum(100 * a.score / a.max_score for a in atts if a.max_score) / len(atts)) if atts else None
            out.append(item)
        return {"tests": out}
    b, g = curriculum.normalise(user.board, user.grade)
    tests = db.scalars(select(ClassTest).where(ClassTest.board == b, ClassTest.grade == g, ClassTest.published.is_(True))
                       .order_by(ClassTest.created_at.desc())).all()
    mine = {a.test_id: a for a in db.scalars(select(TestAttempt).where(TestAttempt.student_id == user.id)).all()}
    out = []
    for t in tests:
        item = _test_out(t, reveal=False, attempt=mine.get(t.id), teacher=db.get(User, t.teacher_id))
        item.pop("questions")
        out.append(item)
    return {"tests": out}


@router.get("/{test_id}")
def get_test(test_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    t = _load(db, test_id)
    if not _can_see(t, user):
        raise HTTPException(status_code=404, detail="Test not found.")
    attempt = db.scalars(select(TestAttempt).where(TestAttempt.test_id == t.id, TestAttempt.student_id == user.id)).first()
    return _test_out(t, reveal=_is_teacher(user) or attempt is not None, attempt=attempt, teacher=db.get(User, t.teacher_id))


class SubmitIn(BaseModel):
    answers: dict[str, list[int]]
    time_taken_sec: int = Field(default=0, ge=0, le=6 * 3600)


@router.post("/{test_id}/submit")
def submit(test_id: str, payload: SubmitIn, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    t = _load(db, test_id)
    if user.role != "student" or not _can_see(t, user):
        raise HTTPException(status_code=403, detail="This test isn't for your class.")
    if db.scalars(select(TestAttempt).where(TestAttempt.test_id == t.id, TestAttempt.student_id == user.id)).first():
        raise HTTPException(status_code=409, detail="You've already submitted this test.")
    score = sum(_grade(q, payload.answers.get(q["id"], [])) for q in t.questions)
    max_score = sum(q["marks"] for q in t.questions)
    a = TestAttempt(test_id=t.id, student_id=user.id, answers=payload.answers, score=round(score, 2),
                    max_score=max_score, time_taken_sec=payload.time_taken_sec)
    db.add(a)
    db.flush()
    pct = round(100 * score / max_score) if max_score else 0
    school.notify(db, t.teacher_id, "test", f"{user.full_name} finished {t.title}", f"Scored {pct}%", f"/teacher?tab=tests&test={t.id}")
    return report(test_id, user, db)


def _ranked(db: Session, t: ClassTest) -> list[tuple[TestAttempt, User]]:
    rows = db.execute(select(TestAttempt, User).join(User, User.id == TestAttempt.student_id).where(TestAttempt.test_id == t.id)).all()
    return sorted(rows, key=lambda r: (-r[0].score, r[0].time_taken_sec, r[1].full_name))


def _classmates(db: Session, board: str, grade: str) -> list[User]:
    return [u for u in db.scalars(select(User).where(User.role == "student", User.is_active.is_(True))).all()
            if curriculum.normalise(u.board, u.grade) == (board, grade)]


@router.get("/leaderboard/class")
def class_test_leaderboard(subject: Optional[str] = None, user: User = Depends(get_current_user),
                           db: Session = Depends(get_db, scope="function")):
    """Tests only (games have their own board): average score across the class's tests, then total time."""
    b, g = curriculum.normalise(user.board, user.grade)
    if not b or not g:
        return {"rows": [], "me": None, "tests": 0}
    mates = _classmates(db, b, g)
    q = select(ClassTest).where(ClassTest.board == b, ClassTest.grade == g)
    if subject:
        q = q.where(ClassTest.subject == subject)
    tests = {t.id: t for t in db.scalars(q).all()}
    agg = defaultdict(lambda: {"pct": 0.0, "n": 0, "time": 0})
    for a in db.scalars(select(TestAttempt).where(TestAttempt.test_id.in_(list(tests) or ["-"]))).all():
        st = agg[a.student_id]
        st["pct"] += 100 * a.score / a.max_score if a.max_score else 0
        st["n"] += 1
        st["time"] += a.time_taken_sec
    avg = lambda uid: agg[uid]["pct"] / agg[uid]["n"] if agg[uid]["n"] else -1
    ranked = sorted(mates, key=lambda u: (-avg(u.id), -agg[u.id]["n"], agg[u.id]["time"], u.full_name))
    rows = [{"rank": i + 1, "id": u.id, "full_name": u.full_name, "initials": u.initials, "avatar_color": u.avatar_color,
             "pct": round(avg(u.id)) if agg[u.id]["n"] else None, "tests_taken": agg[u.id]["n"],
             "time_taken_sec": agg[u.id]["time"], "me": u.id == user.id} for i, u in enumerate(ranked)]
    return {"rows": rows[:50], "me": next((r for r in rows if r["me"]), None), "tests": len(tests)}


@router.get("/{test_id}/leaderboard")
def leaderboard(test_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    """Class-only. Ranked by score, then by who finished faster. Provisional until the due time
    (or until everyone in the class has submitted)."""
    t = _load(db, test_id)
    if not _can_see(t, user):
        raise HTTPException(status_code=404, detail="Test not found.")
    rows = []
    for i, (a, u) in enumerate(_ranked(db, t)):
        rows.append({"rank": i + 1, "id": u.id, "full_name": u.full_name, "initials": u.initials, "avatar_color": u.avatar_color,
                     "score": a.score, "max_score": a.max_score, "pct": round(100 * a.score / a.max_score) if a.max_score else 0,
                     "time_taken_sec": a.time_taken_sec, "submitted_at": a.submitted_at.isoformat(), "me": u.id == user.id})
    class_size = len(_classmates(db, t.board, t.grade))
    due = t.due_at if (t.due_at is None or t.due_at.tzinfo) else t.due_at.replace(tzinfo=timezone.utc)
    final = (due is not None and due <= utcnow()) or (class_size > 0 and len(rows) >= class_size)
    return {"test_id": t.id, "title": t.title, "rows": rows, "me": next((r for r in rows if r["me"]), None),
            "due_at": due.isoformat() if due else None, "final": final, "submitted": len(rows), "class_size": class_size,
            "duration_min": t.duration_min}


def _student_detail(t: ClassTest, a: TestAttempt) -> dict:
    per_q, topics = [], defaultdict(lambda: [0.0, 0.0])
    for q in t.questions:
        got = _grade(q, a.answers.get(q["id"], []))
        per_q.append({"id": q["id"], "text": q["text"], "type": q["type"], "options": q["options"], "answer": q["answer"],
                      "picked": a.answers.get(q["id"], []), "marks": q["marks"], "got": got, "correct": got == q["marks"],
                      "topic": q.get("topic") or "General"})
        topics[q.get("topic") or "General"][0] += got
        topics[q.get("topic") or "General"][1] += q["marks"]
    topic_rows = [{"topic": k, "pct": round(100 * v[0] / v[1]) if v[1] else 0} for k, v in topics.items()]
    return {"questions": per_q, "topics": sorted(topic_rows, key=lambda r: r["pct"]),
            "weak_topics": [r["topic"] for r in topic_rows if r["pct"] < 50],
            "strong_topics": [r["topic"] for r in topic_rows if r["pct"] >= 80]}


@router.get("/{test_id}/report")
def report(test_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    t = _load(db, test_id)
    if not _can_see(t, user):
        raise HTTPException(status_code=404, detail="Test not found.")
    ranked = _ranked(db, t)
    n = len(ranked)
    pcts = [100 * a.score / a.max_score for a, _ in ranked if a.max_score]
    summary = {
        "attempts": n, "avg_pct": round(sum(pcts) / n) if n else 0, "top_pct": round(max(pcts)) if pcts else 0,
        "distribution": [sum(1 for p in pcts if lo <= p < hi) for lo, hi in [(0, 40), (40, 60), (60, 80), (80, 101)]],
    }
    if not _is_teacher(user):
        mine = next(((i, a) for i, (a, u) in enumerate(ranked) if u.id == user.id), None)
        if not mine:
            raise HTTPException(status_code=404, detail="You haven't taken this test yet.")
        i, a = mine
        return {"test": _test_out(t, reveal=True, attempt=a), "class": summary, "rank": i + 1, "of": n,
                "percentile": round(100 * (n - i - 1) / (n - 1)) if n > 1 else 100,
                "time_taken_sec": a.time_taken_sec, **_student_detail(t, a)}

    per_q = []
    for q in t.questions:
        got = [_grade(q, a.answers.get(q["id"], [])) for a, _ in ranked]
        wrong_picks = defaultdict(int)
        for a, _ in ranked:
            for p in a.answers.get(q["id"], []):
                if p not in q["answer"]:
                    wrong_picks[q["options"][p] if p < len(q["options"]) else str(p)] += 1
        per_q.append({"id": q["id"], "text": q["text"], "topic": q.get("topic") or "General",
                      "correct_pct": round(100 * sum(1 for g in got if g == q["marks"]) / n) if n else 0,
                      "common_wrong": sorted(wrong_picks.items(), key=lambda x: -x[1])[:2]})
    students = []
    for i, (a, u) in enumerate(ranked):
        d = _student_detail(t, a)
        students.append({"rank": i + 1, "id": u.id, "full_name": u.full_name, "initials": u.initials, "avatar_color": u.avatar_color,
                         "pct": round(100 * a.score / a.max_score) if a.max_score else 0, "score": a.score, "max_score": a.max_score,
                         "time_taken_sec": a.time_taken_sec, "weak_topics": d["weak_topics"], "strong_topics": d["strong_topics"],
                         "wrong": [q["text"] for q in d["questions"] if not q["correct"]][:5]})
    b, g = t.board, t.grade
    taken = {u.id for _, u in ranked}
    pending = [u.full_name for u in db.scalars(select(User).where(User.role == "student")).all()
               if curriculum.normalise(u.board, u.grade) == (b, g) and u.id not in taken]
    topic_pct = defaultdict(list)
    for q in per_q:
        topic_pct[q["topic"]].append(q["correct_pct"])
    return {"test": _test_out(t, reveal=True), "class": summary, "questions": per_q, "students": students,
            "not_attempted": pending,
            "topics": sorted([{"topic": k, "pct": round(sum(v) / len(v))} for k, v in topic_pct.items()], key=lambda r: r["pct"]),
            "needs_help": [s for s in students if s["pct"] < 40]}


@router.delete("/{test_id}")
def delete_test(test_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    t = _load(db, test_id)
    if user.role != "admin" and t.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="Only the teacher who made it can delete this test.")
    db.delete(t)
    return {"ok": True}
