"""Doubts and live chat between students, the doubt agents and teachers."""
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from modules.backend.src.db.base import get_db
from modules.backend.src.db.models import DoubtMessage, DoubtThread, Lesson, User, utcnow
from modules.backend.src.deps import get_current_user
from modules.backend.src.services import doubt_agents, school

router = APIRouter(prefix="/doubts", tags=["doubts"])

NOTE_EXT = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".md", ".docx", ".pptx"}
VIDEO_EXT = {".mp4", ".webm", ".mov", ".m4v"}
NOTE_MAX = 15 * 1024 * 1024
VIDEO_MAX = 200 * 1024 * 1024


def _msg(m: DoubtMessage) -> dict:
    expired = bool((m.meta or {}).get("expired"))
    return {
        "id": m.id, "role": m.role, "kind": m.kind, "body": m.body, "sender_id": m.sender_id,
        "attachment_name": m.attachment_name, "has_attachment": bool(m.attachment_path), "expired": expired,
        "expires_at": m.expires_at.isoformat() if m.expires_at else None,
        "scheduled_at": m.scheduled_at.isoformat() if m.scheduled_at else None,
        "meeting_url": m.meeting_url, "meta": m.meta or {}, "created_at": m.created_at.isoformat(),
    }


def _thread(db: Session, t: DoubtThread, with_messages: bool = True) -> dict:
    student = db.get(User, t.student_id)
    teacher = db.get(User, t.teacher_id) if t.teacher_id else None
    person = lambda u: {"id": u.id, "full_name": u.full_name, "initials": u.initials, "avatar_color": u.avatar_color,
                        "grade": u.grade, "board": u.board} if u else None
    last = t.messages[-1] if t.messages else None
    out = {
        "id": t.id, "kind": t.kind, "subject": t.subject, "topic": t.topic, "lesson_id": t.lesson_id,
        "question": t.question, "chapter": t.chapter, "board": t.board, "grade": t.grade,
        "escalated_at": t.escalated_at.isoformat() if t.escalated_at else None,
        "resolved_at": t.resolved_at.isoformat() if t.resolved_at else None,
        "status": t.status, "ai_attempts": t.ai_attempts, "max_ai_tries": doubt_agents.MAX_AI_TRIES,
        "student": person(student), "teacher": person(teacher),
        "created_at": t.created_at.isoformat(), "updated_at": t.updated_at.isoformat(),
        "last": _msg(last) if last else None,
    }
    if with_messages:
        out["messages"] = [_msg(m) for m in t.messages]
    return out


def _load(db: Session, thread_id: str, user: User) -> DoubtThread:
    t = db.get(DoubtThread, thread_id)
    if not t:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    if user.role == "admin" or t.student_id == user.id or t.teacher_id == user.id:
        return t
    raise HTTPException(status_code=404, detail="Conversation not found.")


def _require_teacher_of(t: DoubtThread, user: User) -> None:
    if user.role not in ("teacher", "admin") or (user.role == "teacher" and t.teacher_id != user.id):
        raise HTTPException(status_code=403, detail="Only this student's teacher can reply here.")


def _touch(t: DoubtThread) -> None:
    t.updated_at = utcnow()


# How a doubt reads to the person looking at it:
#   teacher/admin: escalated = needs a reply, answered = in progress (awaiting the student), resolved = completed
#   student:       open = with Saathi, escalated = with the teacher, answered = teacher replied, resolved = solved
STAGE = {"open": "with_ai", "escalated": "open", "answered": "in_progress", "resolved": "completed"}


def _scoped(user: User, kind: Optional[str] = "doubt"):
    q = select(DoubtThread)
    if user.role == "student":
        q = q.where(DoubtThread.student_id == user.id)
    elif user.role == "teacher":
        q = q.where(DoubtThread.teacher_id == user.id)
    if kind:
        q = q.where(DoubtThread.kind == kind)
    return q


def _filtered(q, *, status=None, board=None, grade=None, subject=None, chapter=None, topic=None, student_id=None, search=None):
    if status:
        q = q.where(DoubtThread.status.in_(status.split(",")))
    if board:
        q = q.where(DoubtThread.board == board)
    if grade:
        q = q.where(DoubtThread.grade == grade)
    if subject:
        q = q.where(DoubtThread.subject == subject)
    if chapter:
        q = q.where(DoubtThread.chapter == chapter)
    if topic:
        q = q.where(DoubtThread.topic == topic)
    if student_id:
        q = q.where(DoubtThread.student_id == student_id)
    if search:
        like = f"%{search.strip()}%"
        q = q.join(User, User.id == DoubtThread.student_id).where(
            or_(DoubtThread.question.ilike(like), DoubtThread.topic.ilike(like), User.full_name.ilike(like)))
    return q


@router.get("")
def list_threads(kind: Optional[str] = None, status: Optional[str] = None, board: Optional[str] = None,
                 grade: Optional[str] = None, subject: Optional[str] = None, chapter: Optional[str] = None,
                 topic: Optional[str] = None, student_id: Optional[str] = None, q: Optional[str] = None,
                 sort: str = "recent", limit: int = 30, offset: int = 0,
                 user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    """Paged, filterable doubts. A teacher sees only the doubts routed to them."""
    query = _filtered(_scoped(user, kind), status=status, board=board, grade=grade, subject=subject,
                      chapter=chapter, topic=topic, student_id=student_id, search=q)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    # "oldest" puts the longest-waiting doubts first — the fair order for a teacher's queue.
    order = DoubtThread.escalated_at.asc() if sort == "oldest" else DoubtThread.updated_at.desc()
    rows = db.scalars(query.order_by(order).limit(max(1, min(limit, 100))).offset(max(0, offset))).all()
    return {"threads": [_thread(db, t, with_messages=False) for t in rows], "total": total,
            "limit": limit, "offset": offset}


@router.get("/stats")
def stats(user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    """Counts by stage and every dimension the doubt manager filters on."""
    rows = db.scalars(_scoped(user)).all()
    count = lambda xs: sorted(({"value": k, "count": v} for k, v in xs.items() if k), key=lambda r: -r["count"])
    by = {k: {} for k in ("subject", "class", "chapter", "topic", "student")}
    stages = {"with_ai": 0, "open": 0, "in_progress": 0, "completed": 0}
    waits, students = [], {}
    for t in rows:
        stages[STAGE.get(t.status, "open")] += 1
        if t.status in ("escalated", "answered") or user.role == "student":
            by["subject"][t.subject] = by["subject"].get(t.subject, 0) + 1
            cls = f"{t.board}-{t.grade}" if t.board and t.grade else None
            by["class"][cls] = by["class"].get(cls, 0) + 1
            by["chapter"][t.chapter] = by["chapter"].get(t.chapter, 0) + 1
            by["topic"][t.topic] = by["topic"].get(t.topic, 0) + 1
            by["student"][t.student_id] = by["student"].get(t.student_id, 0) + 1
        if t.escalated_at and t.status == "escalated":
            esc = t.escalated_at if t.escalated_at.tzinfo else t.escalated_at.replace(tzinfo=timezone.utc)
            waits.append((utcnow() - esc).total_seconds() / 3600)
        students.setdefault(t.student_id, None)
    names = {u.id: u.full_name for u in db.scalars(select(User).where(User.id.in_(list(students)))).all()}
    student_rows = [{"value": sid, "label": names.get(sid, "?"), "count": c} for sid, c in by["student"].items()]
    return {
        **stages, "total": len(rows),
        "oldest_wait_hours": round(max(waits), 1) if waits else 0,
        "subjects": count(by["subject"]), "classes": count(by["class"]), "chapters": count(by["chapter"]),
        "topics": count(by["topic"])[:30], "students": sorted(student_rows, key=lambda r: -r["count"])[:30],
    }


class BulkIn(BaseModel):
    thread_ids: list[str] = Field(min_length=1, max_length=100)
    body: str = Field(default="", max_length=4000)
    kind: str = Field(default="text", pattern=r"^(text|live)$")
    scheduled_at: Optional[datetime] = None
    duration_min: int = Field(default=30, ge=10, le=180)


@router.post("/bulk")
def bulk_reply(payload: BulkIn, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    """One answer — or one live class — for many students who asked the same thing."""
    if user.role not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Only teachers can reply to doubts.")
    if payload.kind == "text" and not payload.body.strip():
        raise HTTPException(status_code=422, detail="Write the reply first.")
    if payload.kind == "live" and not payload.scheduled_at:
        raise HTTPException(status_code=422, detail="Pick a time for the live class.")
    when = None
    url = None
    if payload.kind == "live":
        when = payload.scheduled_at if payload.scheduled_at.tzinfo else payload.scheduled_at.replace(tzinfo=timezone.utc)
        url = f"https://meet.jit.si/VidyaSaathi-{uuid.uuid4().hex[:10]}"  # one room for the whole group
    done = 0
    for tid in dict.fromkeys(payload.thread_ids):
        t = db.get(DoubtThread, tid)
        if not t or (user.role == "teacher" and t.teacher_id != user.id):
            continue
        db.add(DoubtMessage(thread_id=t.id, sender_id=user.id, role="teacher", kind=payload.kind, body=payload.body.strip(),
                            scheduled_at=when, meeting_url=url,
                            meta={"duration_min": payload.duration_min, "group": len(payload.thread_ids)} if when else {"group": len(payload.thread_ids)}))
        if t.kind == "doubt" and t.status != "resolved":
            t.status = "answered"
        _touch(t)
        title = f"Live class with {user.full_name}" if when else f"{user.full_name} replied"
        school.notify(db, t.student_id, "live" if when else "reply", title, (t.topic or payload.body)[:140], f"/doubts?thread={t.id}")
        done += 1
    db.flush()
    return {"updated": done}


class AskIn(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    lesson_id: Optional[str] = None
    node_id: Optional[str] = Field(default=None, max_length=80)
    subject: Optional[str] = Field(default=None, max_length=60)
    topic: Optional[str] = Field(default=None, max_length=300)
    # The lesson concept on screen when asked; helps the agents, not shown to teachers.
    concept: Optional[str] = Field(default=None, max_length=300)
    lang: str = Field(default="en", max_length=10)


@router.post("")
def ask(payload: AskIn, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    """A new doubt: stored, then answered by the doubt agents straight away."""
    lesson = db.get(Lesson, payload.lesson_id) if payload.lesson_id else None
    if lesson is not None and lesson.user_id != user.id:
        lesson = None
    t = DoubtThread(student_id=user.id, kind="doubt", subject=payload.subject, topic=payload.topic,
                    lesson_id=lesson.id if lesson else None, node_id=payload.node_id)
    db.add(t)
    db.flush()
    doubt_agents.stamp(db, user, t, payload.question)
    db.add(DoubtMessage(thread_id=t.id, sender_id=user.id, role="student", body=payload.question.strip()))
    db.flush()
    db.refresh(t)
    asked = f"{payload.question.strip()} (about: {payload.concept})" if payload.concept else payload.question
    doubt_agents.answer(db, user, t, asked, payload.lang)
    db.refresh(t)
    return _thread(db, t)


@router.get("/{thread_id}")
def get_thread(thread_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    return _thread(db, _load(db, thread_id, user))


class MessageIn(BaseModel):
    body: str = Field(min_length=1, max_length=4000)
    lang: str = Field(default="en", max_length=10)


@router.post("/{thread_id}/messages")
def post_message(thread_id: str, payload: MessageIn, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db, scope="function")):
    t = _load(db, thread_id, user)
    if t.student_id == user.id:
        db.add(DoubtMessage(thread_id=t.id, sender_id=user.id, role="student", body=payload.body.strip()))
        db.flush()
        db.refresh(t)
        if t.kind == "doubt" and t.status in ("open", "resolved") and not t.teacher_id:
            # A follow-up question while the agents still own the doubt.
            t.status = "open"
            doubt_agents.answer(db, user, t, payload.body, payload.lang)
        else:
            school.notify(db, t.teacher_id, "chat", f"Message from {user.full_name}", payload.body[:140],
                          f"/teacher?tab=doubts&thread={t.id}")
    else:
        _require_teacher_of(t, user)
        db.add(DoubtMessage(thread_id=t.id, sender_id=user.id, role="teacher", body=payload.body.strip()))
        if t.kind == "doubt":
            t.status = "answered"
        school.notify(db, t.student_id, "reply", f"{user.full_name} replied", payload.body[:140], f"/doubts?thread={t.id}")
    _touch(t)
    db.flush()
    db.refresh(t)
    return _thread(db, t)


@router.post("/{thread_id}/confused")
def still_confused(thread_id: str, lang: str = "en", user: User = Depends(get_current_user),
                   db: Session = Depends(get_db, scope="function")):
    """"Still don't get it": the agents try a simpler way; after the last try it goes to a teacher."""
    t = _load(db, thread_id, user)
    if t.student_id != user.id:
        raise HTTPException(status_code=403, detail="Only the student can say this.")
    db.add(DoubtMessage(thread_id=t.id, sender_id=user.id, role="student", body="I still don't understand.",
                        meta={"confused": True}))
    db.flush()
    db.refresh(t)
    if t.teacher_id or t.status in ("escalated", "answered"):
        if t.status == "answered":
            t.status = "escalated"
        school.notify(db, t.teacher_id, "doubt", f"{user.full_name} is still confused", t.topic or "", f"/teacher?tab=doubts&thread={t.id}")
    elif t.ai_attempts >= doubt_agents.MAX_AI_TRIES:
        doubt_agents.escalate(db, user, t, "auto")
    else:
        first = next((m.body for m in t.messages if m.role == "student"), "")
        doubt_agents.answer(db, user, t, first, lang)
    _touch(t)
    db.flush()
    db.refresh(t)
    return _thread(db, t)


@router.post("/{thread_id}/understood")
def understood(thread_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    t = _load(db, thread_id, user)
    t.status = "resolved"
    t.resolved_at = utcnow()
    db.add(DoubtMessage(thread_id=t.id, sender_id=user.id, role="system", body="Marked as understood 🎉"))
    if t.teacher_id and user.id == t.student_id:
        school.notify(db, t.teacher_id, "resolved", f"{user.full_name} understood it", t.topic or "", f"/teacher?tab=doubts&thread={t.id}")
    _touch(t)
    db.flush()
    db.refresh(t)
    return _thread(db, t)


@router.post("/{thread_id}/escalate")
def escalate(thread_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    t = _load(db, thread_id, user)
    if t.student_id != user.id:
        raise HTTPException(status_code=403, detail="Only the student can ask for a teacher.")
    if not t.teacher_id:
        doubt_agents.escalate(db, user, t, "manual")
    _touch(t)
    db.flush()
    db.refresh(t)
    return _thread(db, t)


async def _save_upload(file: UploadFile, allowed: set, limit: int) -> tuple[Path, str]:
    name = Path(file.filename or "file").name[:200]
    ext = Path(name).suffix.lower()
    if ext not in allowed:
        raise HTTPException(status_code=415, detail=f"Allowed file types: {', '.join(sorted(allowed))}.")
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status_code=413, detail=f"File is over {limit // (1024 * 1024)} MB.")
    dest = school.media_dir() / f"{uuid.uuid4().hex}{ext}"
    dest.write_bytes(data)
    return dest, name


@router.post("/{thread_id}/notes")
async def send_notes(thread_id: str, body: str = Form(default=""), file: Optional[UploadFile] = File(default=None),
                     user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    t = _load(db, thread_id, user)
    _require_teacher_of(t, user)
    if not body.strip() and file is None:
        raise HTTPException(status_code=422, detail="Write some notes or attach a file.")
    path = name = None
    if file is not None:
        path, name = await _save_upload(file, NOTE_EXT, NOTE_MAX)
    db.add(DoubtMessage(thread_id=t.id, sender_id=user.id, role="teacher", kind="notes", body=body.strip(),
                        attachment_path=str(path) if path else None, attachment_name=name))
    t.status = "answered" if t.kind == "doubt" else t.status
    school.notify(db, t.student_id, "reply", f"{user.full_name} sent you notes", t.topic or "", f"/doubts?thread={t.id}")
    _touch(t)
    db.flush()
    db.refresh(t)
    return _thread(db, t)


@router.post("/{thread_id}/video")
async def send_video(thread_id: str, body: str = Form(default=""), file: UploadFile = File(...),
                     user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    """A recorded explanation. Kept for DOUBT_VIDEO_TTL_DAYS, then deleted automatically."""
    t = _load(db, thread_id, user)
    _require_teacher_of(t, user)
    path, name = await _save_upload(file, VIDEO_EXT, VIDEO_MAX)
    expires = school.video_expiry()
    db.add(DoubtMessage(thread_id=t.id, sender_id=user.id, role="teacher", kind="video", body=body.strip(),
                        attachment_path=str(path), attachment_name=name, expires_at=expires))
    t.status = "answered" if t.kind == "doubt" else t.status
    school.notify(db, t.student_id, "reply", f"{user.full_name} recorded a video answer",
                  f"Watch it before {expires.strftime('%d %b')} — it's removed after {school.VIDEO_TTL_DAYS} days.", f"/doubts?thread={t.id}")
    _touch(t)
    db.flush()
    db.refresh(t)
    return _thread(db, t)


class LiveIn(BaseModel):
    scheduled_at: datetime
    note: str = Field(default="", max_length=500)
    duration_min: int = Field(default=30, ge=10, le=180)


@router.post("/{thread_id}/live")
def schedule_live(thread_id: str, payload: LiveIn, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db, scope="function")):
    t = _load(db, thread_id, user)
    _require_teacher_of(t, user)
    when = payload.scheduled_at if payload.scheduled_at.tzinfo else payload.scheduled_at.replace(tzinfo=timezone.utc)
    room = f"VidyaSaathi-{uuid.uuid4().hex[:10]}"
    db.add(DoubtMessage(thread_id=t.id, sender_id=user.id, role="teacher", kind="live", body=payload.note.strip(),
                        scheduled_at=when, meeting_url=f"https://meet.jit.si/{room}",
                        meta={"duration_min": payload.duration_min}))
    t.status = "answered" if t.kind == "doubt" else t.status
    school.notify(db, t.student_id, "live", f"Live class with {user.full_name}",
                  f"{t.topic or 'Your doubt'} — {when.strftime('%d %b, %H:%M')} UTC", f"/doubts?thread={t.id}")
    _touch(t)
    db.flush()
    db.refresh(t)
    return _thread(db, t)


@router.get("/media/{message_id}")
def media(message_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    m = db.get(DoubtMessage, message_id)
    if not m:
        raise HTTPException(status_code=404, detail="Not found.")
    _load(db, m.thread_id, user)
    if not m.attachment_path or (m.meta or {}).get("expired"):
        raise HTTPException(status_code=410, detail="This recording has expired and was removed.")
    if m.expires_at and m.expires_at < utcnow():
        raise HTTPException(status_code=410, detail="This recording has expired and was removed.")
    path = Path(m.attachment_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File missing.")
    return FileResponse(path, filename=m.attachment_name or path.name)


class ChatIn(BaseModel):
    with_id: str


@router.post("/chat")
def open_chat(payload: ChatIn, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    """Open (or reuse) the live chat between a student and one of their teachers."""
    other = db.get(User, payload.with_id)
    if not other:
        raise HTTPException(status_code=404, detail="Person not found.")
    if user.role == "student" and other.role == "teacher":
        student, teacher = user, other
    elif user.role in ("teacher", "admin") and other.role == "student":
        student, teacher = other, user
    else:
        raise HTTPException(status_code=422, detail="Chats are between a student and a teacher.")
    t = db.scalars(select(DoubtThread).where(DoubtThread.kind == "chat", DoubtThread.student_id == student.id,
                                             DoubtThread.teacher_id == teacher.id)).first()
    if not t:
        t = DoubtThread(student_id=student.id, teacher_id=teacher.id, kind="chat", status="answered",
                        topic=f"Chat with {teacher.full_name}")
        db.add(t)
        db.flush()
        db.refresh(t)
    return _thread(db, t)

