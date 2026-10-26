"""Board syllabus path, topic progress, games and the teacher's view of students."""
from collections import defaultdict
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from modules.backend.src.db.base import get_db
from modules.backend.src.db.models import DoubtThread, GameScore, TestAttempt, ClassTest, User
from modules.backend.src.deps import get_current_user
from modules.backend.src.services import curriculum, school

router = APIRouter(tags=["curriculum"])


def require_teacher(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="This area is for teachers.")
    return user


def _person(u: User) -> dict:
    return {"id": u.id, "full_name": u.full_name, "initials": u.initials, "email": u.email,
            "avatar_color": u.avatar_color, "board": u.board, "grade": u.grade}


# --------------------------------------------------------------------------
# Syllabus
# --------------------------------------------------------------------------

@router.get("/curriculum/boards")
def boards():
    """Public: what the sign-up form offers, and each class's subjects."""
    return {
        "boards": list(curriculum.BOARDS),
        "grades": list(curriculum.GRADES),
        "subjects": {b: {g: [s["name"] for s in curriculum.tree(b, g)] for g in curriculum.GRADES} for b in curriculum.BOARDS},
    }


@router.get("/curriculum/path")
def get_path(
    board: Optional[str] = None, grade: Optional[str] = None,
    user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function"),
):
    data = curriculum.path(db, user, board, grade)
    if user.role == "student" and data["configured"]:
        school.mentor_of(db, user)
    return data


class TopicStateIn(BaseModel):
    done: bool = True


@router.post("/curriculum/topics/{topic_id}/start")
def start_topic(topic_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    row = curriculum.start_topic(db, user, topic_id)
    if row is None:
        raise HTTPException(status_code=404, detail="That topic is not in the syllabus.")
    return {"topic_id": topic_id, "status": row.status}


@router.post("/curriculum/topics/{topic_id}/complete")
def complete_topic(topic_id: str, payload: TopicStateIn, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db, scope="function")):
    row = curriculum.complete_topic(db, user, topic_id, payload.done)
    if row is None:
        raise HTTPException(status_code=404, detail="That topic is not in the syllabus.")
    return {"topic_id": topic_id, "status": row.status}


@router.get("/curriculum/my-teachers")
def my_teachers(user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    mentor = school.mentor_of(db, user)
    subjects = []
    for name in curriculum.subjects_for(user.board, user.grade):
        t = school.subject_teacher(db, user, name)
        subjects.append({"subject": name, "teacher": _person(t) if t else None})
    return {"mentor": _person(mentor) if mentor else None, "subjects": subjects}


# --------------------------------------------------------------------------
# Games: points per topic game, class leaderboard
# --------------------------------------------------------------------------

class GameScoreIn(BaseModel):
    subject: str = Field(max_length=60)
    topic: str = Field(default="", max_length=300)
    game: str = Field(pattern=r"^[a-z0-9_-]{2,30}$")
    correct: int = Field(ge=0, le=200)
    total: int = Field(ge=1, le=200)
    streak: int = Field(default=0, ge=0, le=200)


@router.post("/games/score")
def game_score(payload: GameScoreIn, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    correct = min(payload.correct, payload.total)
    # 10 per right answer, a streak bonus, and a perfect-round bonus.
    points = correct * 10 + min(payload.streak, payload.total) * 2 + (20 if correct == payload.total else 0)
    db.add(GameScore(user_id=user.id, board=user.board, grade=user.grade, subject=payload.subject,
                     topic=payload.topic, game=payload.game, correct=correct, total=payload.total, points=points))
    db.flush()
    total = db.scalar(select(func.coalesce(func.sum(GameScore.points), 0)).where(GameScore.user_id == user.id)) or 0
    return {"points": points, "total_points": int(total)}


def _classmates(db: Session, user: User) -> list[User]:
    b, g = curriculum.normalise(user.board, user.grade)
    rows = db.scalars(select(User).where(User.role == "student", User.is_active.is_(True))).all()
    return [u for u in rows if curriculum.normalise(u.board, u.grade) == (b, g)]


def _coins(db: Session, user: User) -> int:
    """Spendable coins: every point earned in games minus hints bought."""
    return int(db.scalar(select(func.coalesce(func.sum(GameScore.points), 0)).where(GameScore.user_id == user.id)) or 0)


@router.get("/games/leaderboard")
def class_leaderboard(subject: Optional[str] = None, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db, scope="function")):
    """Games only, within the student's own board and class: points, stars and a league tier."""
    mates = _classmates(db, user)
    ids = [u.id for u in mates]
    stats = defaultdict(lambda: {"points": 0, "games": 0, "stars": 0, "accuracy_n": 0, "accuracy_d": 0})
    q = select(GameScore).where(GameScore.user_id.in_(ids), GameScore.game != "hint")
    if subject:
        q = q.where(GameScore.subject == subject)
    for g in db.scalars(q).all():
        st = stats[g.user_id]
        st["points"] += g.points
        st["games"] += 1
        st["stars"] += g.stars or 0
        st["accuracy_n"] += g.correct
        st["accuracy_d"] += g.total
    tier = lambda p: "Diamond" if p >= 1500 else "Gold" if p >= 700 else "Silver" if p >= 250 else "Bronze"
    rows = sorted(mates, key=lambda u: (-stats[u.id]["points"], -stats[u.id]["stars"], u.full_name))
    board = []
    for i, u in enumerate(rows):
        st = stats[u.id]
        board.append({**_person(u), "rank": i + 1, "me": u.id == user.id, "points": st["points"], "games": st["games"],
                      "stars": st["stars"], "tier": tier(st["points"]),
                      "accuracy": round(100 * st["accuracy_n"] / st["accuracy_d"]) if st["accuracy_d"] else None})
    mine = next((r for r in board if r["me"]), None)
    ahead = board[mine["rank"] - 2] if mine and mine["rank"] > 1 else None
    return {"board": user.board, "grade": user.grade, "subject": subject, "rows": board[:50], "me": mine,
            "gap": {"name": ahead["full_name"], "points": ahead["points"] - mine["points"] + 1} if ahead else None}


# --------------------------------------------------------------------------
# Gyaan Yatra: each chapter is a level, each sub-topic a stage
# --------------------------------------------------------------------------

JOURNEY_CHAPTERS = 4     # demo: the first chapters of every subject
JOURNEY_STAGES = 4       # and up to four stages (sub-topics) in each
STAGE_GAMES = ["quiz", "truefalse", "match", "oddone"]
HINT_PRICE = 5


def _journey(db: Session, user: User, subject: str) -> dict:
    b, g = curriculum.normalise(user.board, user.grade)
    subj = next((s for s in curriculum.tree(b, g) if s["name"] == subject), None) if b and g else None
    if not subj:
        raise HTTPException(status_code=404, detail="That subject is not in your class.")
    best: dict = {}
    for gs in db.scalars(select(GameScore).where(GameScore.user_id == user.id, GameScore.game == "journey", GameScore.subject == subject)).all():
        best[gs.topic] = max(best.get(gs.topic, 0), gs.stars or 0)
    levels, unlocked, order = [], True, 0
    for c in subj["chapters"][:JOURNEY_CHAPTERS]:
        stages = []
        for ti, t in enumerate(c["topics"][:JOURNEY_STAGES]):
            stars = best.get(t["id"], 0)
            stages.append({"id": t["id"], "title": t["title"], "number": t["number"], "game": STAGE_GAMES[(order + ti) % len(STAGE_GAMES)],
                           "stars": stars, "done": stars > 0, "unlocked": unlocked})
            unlocked = unlocked and stars > 0  # the next stage opens once this one is cleared
        order += 1
        levels.append({"id": c["id"], "number": c["number"], "title": c["title"], "stages": stages,
                       "stars": sum(x["stars"] for x in stages), "max_stars": 3 * len(stages),
                       "done": all(x["done"] for x in stages), "unlocked": stages[0]["unlocked"] if stages else False})
    return {"subject": subject, "levels": levels, "coins": _coins(db, user), "hint_price": HINT_PRICE,
            "total_chapters": len(subj["chapters"]), "demo_chapters": JOURNEY_CHAPTERS}


@router.get("/games/journey")
def journey(subject: str, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    return _journey(db, user, subject)


class StageResultIn(BaseModel):
    subject: str = Field(max_length=60)
    topic_id: str = Field(max_length=160)
    correct: int = Field(ge=0, le=50)
    total: int = Field(ge=1, le=50)
    hearts_left: int = Field(ge=0, le=3)
    hints_used: int = Field(default=0, ge=0, le=20)


@router.post("/games/journey/complete")
def journey_complete(payload: StageResultIn, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    """Score a stage: ★ for clearing it (half right and a heart left), ★ for keeping every heart,
    ★ for a flawless run with no hints. Clearing unlocks the next stage."""
    j = _journey(db, user, payload.subject)
    stage = next((s for lv in j["levels"] for s in lv["stages"] if s["id"] == payload.topic_id), None)
    if not stage:
        raise HTTPException(status_code=404, detail="That stage is not on your journey.")
    if not stage["unlocked"]:
        raise HTTPException(status_code=409, detail="Clear the previous stage first.")
    correct = min(payload.correct, payload.total)
    cleared = payload.hearts_left > 0 and correct * 2 >= payload.total
    stars = 0 if not cleared else 1 + (payload.hearts_left == 3) + (correct == payload.total and payload.hints_used == 0)
    points = correct * 10 + stars * 15
    db.add(GameScore(user_id=user.id, board=user.board, grade=user.grade, subject=payload.subject, topic=payload.topic_id,
                     game="journey", correct=correct, total=payload.total, points=points, stars=stars))
    db.flush()
    after = _journey(db, user, payload.subject)
    flat = [s for lv in after["levels"] for s in lv["stages"]]
    idx = next(i for i, s in enumerate(flat) if s["id"] == payload.topic_id)
    nxt = flat[idx + 1] if idx + 1 < len(flat) else None
    return {"stars": stars, "cleared": cleared, "points": points, "coins": after["coins"],
            "next": nxt if nxt and nxt["unlocked"] else None, "journey": after}


class SpendIn(BaseModel):
    coins: int = Field(ge=1, le=50)
    reason: str = Field(default="hint", max_length=40)


@router.post("/games/spend")
def spend_coins(payload: SpendIn, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    """Buy a hint with coins. Recorded as a negative score so the balance is always the sum."""
    have = _coins(db, user)
    if have < payload.coins:
        raise HTTPException(status_code=409, detail=f"Not enough coins — you have {have}.")
    db.add(GameScore(user_id=user.id, board=user.board, grade=user.grade, subject="-", topic=payload.reason,
                     game="hint", correct=0, total=0, points=-payload.coins))
    db.flush()
    return {"coins": have - payload.coins}


@router.get("/games/wallet")
def wallet(user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    return {"coins": _coins(db, user)}


# --------------------------------------------------------------------------
# Teacher desk
# --------------------------------------------------------------------------

class Teaching(BaseModel):
    board: Literal["CBSE", "ICSE"]
    grade: str = Field(pattern=r"^(6|7|8|9|10)$")
    subject: str = Field(max_length=60)


class TeacherProfileIn(BaseModel):
    teaching: list[Teaching] = Field(default_factory=list, max_length=60)
    class_teacher_of: list[str] = Field(default_factory=list, max_length=20)


@router.get("/teacher/profile")
def teacher_profile(user: User = Depends(require_teacher)):
    return {"teaching": user.teaching_json or [], "class_teacher_of": user.class_teacher_of or []}


@router.put("/teacher/profile")
def set_teacher_profile(payload: TeacherProfileIn, user: User = Depends(require_teacher),
                        db: Session = Depends(get_db, scope="function")):
    valid = []
    for t in payload.teaching:
        if t.subject not in curriculum.subjects_for(t.board, t.grade):
            raise HTTPException(status_code=422, detail=f"{t.subject} is not a {t.board} Class {t.grade} subject.")
        item = t.model_dump()
        if item not in valid:
            valid.append(item)
    if len({t["subject"] for t in valid}) > 1:
        raise HTTPException(status_code=422, detail="A teacher account is for one subject. Pick your subject, then the classes you teach it in.")
    classes = sorted({c for c in payload.class_teacher_of if c.split("-")[0] in curriculum.BOARDS and c.split("-")[-1] in curriculum.GRADES})
    user.teaching_json = valid
    user.class_teacher_of = classes
    db.flush()
    return {"teaching": valid, "class_teacher_of": classes}


def _student_summary(db: Session, s: User, subjects: list[str], is_mentor: bool) -> dict:
    prog = curriculum.subject_progress(db, s)
    shown = prog if is_mentor else {k: v for k, v in prog.items() if k in subjects}
    rows = db.execute(select(TestAttempt, ClassTest).join(ClassTest, ClassTest.id == TestAttempt.test_id)
                      .where(TestAttempt.student_id == s.id)).all()
    scored = [(a, t) for a, t in rows if a.max_score and (is_mentor or t.subject in subjects)]
    test_avg = round(100 * sum(a.score / a.max_score for a, _ in scored) / len(scored)) if scored else None
    doubt_q = select(DoubtThread).where(DoubtThread.student_id == s.id, DoubtThread.kind == "doubt")
    if not is_mentor:
        doubt_q = doubt_q.where(DoubtThread.subject.in_(subjects or ["-"]))
    doubts = db.scalars(doubt_q).all()
    open_doubts = sum(1 for d in doubts if d.status == "escalated")
    done = sum(v["done"] for v in shown.values())
    total = sum(v["total"] for v in shown.values())
    overall = round(100 * done / total) if total else 0
    focus = _focus(s, overall, test_avg, open_doubts, doubts, shown)
    return {**_person(s), "subjects": subjects, "is_mentor": is_mentor, "progress": shown,
            "overall_pct": overall, "test_avg": test_avg, "tests_taken": len(scored),
            "open_doubts": open_doubts, "doubts_total": len(doubts),
            "last_login_at": s.last_login_at.isoformat() if s.last_login_at else None, **focus}


def _focus(s: User, overall: int, test_avg: Optional[int], open_doubts: int, doubts: list, shown: dict) -> dict:
    """How much a teacher should look at this student now (0-100), and why.

    Transparent rules rather than a model, so a teacher can trust and explain it.
    """
    from datetime import datetime, timedelta, timezone

    score, why = 0, []
    if test_avg is not None and test_avg < 60:
        score += round((60 - test_avg) * 0.7)
        why.append(f"Test average {test_avg}%")
    if open_doubts:
        score += min(24, open_doubts * 8)
        why.append(f"{open_doubts} doubt{'s' if open_doubts > 1 else ''} waiting")
    recent = [d for d in doubts if d.created_at and (datetime.now(timezone.utc) - (d.created_at if d.created_at.tzinfo else d.created_at.replace(tzinfo=timezone.utc))) < timedelta(days=14)]
    if len(recent) >= 3:
        score += min(12, 2 * len(recent))
        why.append(f"{len(recent)} doubts in 2 weeks")
    weak_subjects = [k for k, v in shown.items() if v.get("avg_score") is not None and v["avg_score"] < 50]
    if weak_subjects:
        score += 8 * len(weak_subjects)
        why.append("Low lesson scores in " + ", ".join(weak_subjects))
    if overall < 10:
        score += 8
        why.append("Barely started the syllabus")
    last = s.last_login_at
    if last is not None:
        idle = (datetime.now(timezone.utc) - (last if last.tzinfo else last.replace(tzinfo=timezone.utc))).days
        if idle >= 7:
            score += 15 if idle >= 14 else 8
            why.append(f"Inactive for {idle} days")
    score = min(100, score)
    return {"focus_score": score, "focus_level": "high" if score >= 45 else "medium" if score >= 20 else "low", "focus_reasons": why}


def _my_students(db: Session, user: User):
    if user.role == "admin":
        everyone = db.scalars(select(User).where(User.role == "student")).all()
        return [(s, curriculum.subjects_for(s.board, s.grade), True) for s in everyone]
    return school.students_of(db, user)


@router.get("/teacher/students")
def teacher_students(
    subject: Optional[str] = None, grade: Optional[str] = None, board: Optional[str] = None,
    scope: Literal["all", "subject", "mentor"] = "all", q: Optional[str] = None,
    sort: Literal["focus", "name", "progress", "tests"] = "focus", limit: int = 24, offset: int = 0,
    user: User = Depends(require_teacher), db: Session = Depends(get_db, scope="function"),
):
    rows = []
    for s, subjects, is_mentor in _my_students(db, user):
        if scope == "mentor" and not is_mentor:
            continue
        if scope == "subject" and not subjects:
            continue
        if subject and subject not in subjects and not (is_mentor and subject in curriculum.subjects_for(s.board, s.grade)):
            continue
        b, g = curriculum.normalise(s.board, s.grade)
        if grade and g != grade:
            continue
        if board and b != board:
            continue
        if q and q.strip().lower() not in s.full_name.lower() and q.strip().lower() not in s.email.lower():
            continue
        rows.append(_student_summary(db, s, subjects, is_mentor))
    key = {
        "focus": lambda r: (-r["focus_score"], r["full_name"]),
        "name": lambda r: r["full_name"],
        "progress": lambda r: (r["overall_pct"], r["full_name"]),
        "tests": lambda r: (r["test_avg"] if r["test_avg"] is not None else 101, r["full_name"]),
    }[sort]
    rows.sort(key=key)
    classes = sorted({f"{r['board']}-{r['grade']}" for r in rows if r["board"] and r["grade"]})
    subjects_all = sorted({x for r in rows for x in r["progress"].keys()})
    summary = {"total": len(rows), "high": sum(1 for r in rows if r["focus_level"] == "high"),
               "medium": sum(1 for r in rows if r["focus_level"] == "medium"),
               "avg_progress": round(sum(r["overall_pct"] for r in rows) / len(rows)) if rows else 0,
               "open_doubts": sum(r["open_doubts"] for r in rows)}
    page = rows[max(0, offset): max(0, offset) + max(1, min(limit, 100))]
    return {"students": page, "total": len(rows), "summary": summary, "classes": classes, "subjects": subjects_all,
            "teaching": user.teaching_json or [], "class_teacher_of": user.class_teacher_of or []}


@router.get("/teacher/overview")
def teacher_overview(user: User = Depends(require_teacher), db: Session = Depends(get_db, scope="function")):
    """The teacher's morning view: who needs them, what the class is stuck on, how tests went."""
    pairs = _my_students(db, user)
    rows = [_student_summary(db, s, subjects, m) for s, subjects, m in pairs]
    doubts = db.scalars(select(DoubtThread).where(DoubtThread.kind == "doubt",
                                                   *( [DoubtThread.teacher_id == user.id] if user.role == "teacher" else []))).all()
    stage = {"open": 0, "in_progress": 0, "completed": 0, "with_ai": 0}
    topics: dict = {}
    for d in doubts:
        stage[{"open": "with_ai", "escalated": "open", "answered": "in_progress", "resolved": "completed"}[d.status]] += 1
        if d.status != "resolved" and d.topic:
            k = (d.subject, d.topic)
            topics[k] = topics.get(k, 0) + 1
    tests = db.scalars(select(ClassTest).where(*([ClassTest.teacher_id == user.id] if user.role == "teacher" else []))).all()
    atts = db.scalars(select(TestAttempt).where(TestAttempt.test_id.in_([t.id for t in tests] or ["-"]))).all()
    subj = sorted({t["subject"] for t in (user.teaching_json or [])})
    return {
        "subject": subj[0] if len(subj) == 1 else None, "subjects": subj,
        "classes": sorted({f"{t['board']}-{t['grade']}" for t in (user.teaching_json or [])}),
        "class_teacher_of": user.class_teacher_of or [],
        "students": len(rows), "mentees": sum(1 for _, _, m in pairs if m),
        "avg_progress": round(sum(r["overall_pct"] for r in rows) / len(rows)) if rows else 0,
        "doubts": stage,
        "hot_topics": [{"subject": k[0], "topic": k[1], "count": v} for k, v in sorted(topics.items(), key=lambda x: -x[1])[:6]],
        "focus": sorted([r for r in rows if r["focus_score"] > 0], key=lambda r: -r["focus_score"])[:6],
        "tests": {"count": len(tests), "attempts": len(atts),
                  "avg_pct": round(sum(100 * a.score / a.max_score for a in atts if a.max_score) / len(atts)) if atts else None},
    }


@router.get("/teacher/students/{student_id}")
def teacher_student(student_id: str, user: User = Depends(require_teacher), db: Session = Depends(get_db, scope="function")):
    s = db.get(User, student_id)
    if not s or s.role != "student":
        raise HTTPException(status_code=404, detail="Student not found.")
    mine = {x[0].id: x for x in school.students_of(db, user)} if user.role != "admin" else {s.id: (s, curriculum.subjects_for(s.board, s.grade), True)}
    if s.id not in mine:
        raise HTTPException(status_code=403, detail="This student isn't assigned to you.")
    _, subjects, is_mentor = mine[s.id]
    path = curriculum.path(db, s)
    if not is_mentor:
        path["subjects"] = [x for x in path["subjects"] if x["name"] in subjects]
    tests = []
    for a, t in db.execute(select(TestAttempt, ClassTest).join(ClassTest, ClassTest.id == TestAttempt.test_id)
                           .where(TestAttempt.student_id == s.id).order_by(TestAttempt.submitted_at.desc())).all():
        if is_mentor or t.subject in subjects:
            tests.append({"test_id": t.id, "title": t.title, "subject": t.subject, "score": a.score, "max_score": a.max_score,
                          "pct": round(100 * a.score / a.max_score) if a.max_score else 0, "submitted_at": a.submitted_at.isoformat()})
    games = db.execute(select(GameScore.subject, func.sum(GameScore.points), func.sum(GameScore.correct), func.sum(GameScore.total))
                       .where(GameScore.user_id == s.id).group_by(GameScore.subject)).all()
    doubts = db.scalars(select(DoubtThread).where(DoubtThread.student_id == s.id, DoubtThread.kind == "doubt")
                        .order_by(DoubtThread.updated_at.desc()).limit(20)).all()
    return {
        "student": _student_summary(db, s, subjects, is_mentor), "path": path, "tests": tests,
        "games": [{"subject": g[0], "points": int(g[1] or 0), "accuracy": round(100 * (g[2] or 0) / g[3]) if g[3] else None} for g in games],
        "doubts": [{"id": d.id, "subject": d.subject, "topic": d.topic, "status": d.status, "ai_attempts": d.ai_attempts,
                    "updated_at": d.updated_at.isoformat()} for d in doubts],
    }


@router.get("/teacher/directory")
def teacher_directory(user: User = Depends(require_teacher), db: Session = Depends(get_db, scope="function")):
    """Admins: every teacher, what they teach and how many students they have."""
    out = []
    for t in school.teachers(db):
        students = school.students_of(db, t)
        out.append({**_person(t), "teaching": t.teaching_json or [], "class_teacher_of": t.class_teacher_of or [],
                    "students": len(students), "mentees": sum(1 for x in students if x[2])})
    return {"teachers": out}


class MentorIn(BaseModel):
    teacher_id: str


@router.patch("/teacher/students/{student_id}/mentor")
def set_mentor(student_id: str, payload: MentorIn, user: User = Depends(require_teacher), db: Session = Depends(get_db, scope="function")):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can reassign teachers.")
    s, t = db.get(User, student_id), db.get(User, payload.teacher_id)
    if not s or s.role != "student" or not t or t.role != "teacher":
        raise HTTPException(status_code=404, detail="Student or teacher not found.")
    s.mentor_teacher_id = t.id
    school.notify(db, t.id, "assignment", f"{s.full_name} is now your student", "You'll see their overall progress in My students.", "/teacher?tab=students")
    school.notify(db, s.id, "assignment", f"{t.full_name} is your class teacher", "They'll keep an eye on your progress.", "/doubts")
    db.flush()
    return {"ok": True}
