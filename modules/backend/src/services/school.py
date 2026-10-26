"""Teachers, assignments and notifications.

Teachers declare what they teach ({board, grade, subject}) and which classes
they are class teacher of. Students are matched deterministically: among the
eligible teachers (sorted by id) a stable hash of the student id picks one, so
the same student always lands with the same teacher and load spreads evenly.
"""
import hashlib
import logging
from datetime import timedelta
from pathlib import Path
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.backend.src.config import settings
from modules.backend.src.db.models import DoubtMessage, Notification, User, utcnow
from modules.backend.src.services import curriculum

logger = logging.getLogger(__name__)

# Teacher-recorded answer videos are deleted after this many days.
VIDEO_TTL_DAYS = int(__import__("os").getenv("DOUBT_VIDEO_TTL_DAYS", "7"))


def _pick(student_id: str, candidates: list[User]) -> Optional[User]:
    if not candidates:
        return None
    ordered = sorted(candidates, key=lambda u: u.id)
    h = int(hashlib.sha256(student_id.encode()).hexdigest(), 16)
    return ordered[h % len(ordered)]


def teachers(db: Session) -> list[User]:
    return list(db.scalars(select(User).where(User.role == "teacher", User.is_active.is_(True))).all())


def teaches(t: User, board: Optional[str], grade: Optional[str], subject: Optional[str] = None) -> bool:
    for a in t.teaching_json or []:
        if a.get("board") == board and str(a.get("grade")) == str(grade) and (subject is None or a.get("subject") == subject):
            return True
    return False


def subject_teacher(db: Session, student: User, subject: Optional[str]) -> Optional[User]:
    """The teacher a student's doubts in `subject` go to."""
    board, grade = curriculum.normalise(student.board, student.grade)
    pool = teachers(db)
    exact = [t for t in pool if subject and teaches(t, board, grade, subject)]
    if exact:
        return _pick(student.id, exact)
    # No subject teacher yet: the student's own mentor, then anyone for the class.
    mentor = mentor_of(db, student)
    if mentor:
        return mentor
    return _pick(student.id, [t for t in pool if teaches(t, board, grade)] or pool)


def mentor_of(db: Session, student: User) -> Optional[User]:
    """The student's assigned (class) teacher, assigning one if needed."""
    if student.mentor_teacher_id:
        t = db.get(User, student.mentor_teacher_id)
        if t and t.role == "teacher" and t.is_active:
            return t
    board, grade = curriculum.normalise(student.board, student.grade)
    pool = teachers(db)
    key = f"{board}-{grade}"
    chosen = (
        _pick(student.id, [t for t in pool if key in (t.class_teacher_of or [])])
        or _pick(student.id, [t for t in pool if teaches(t, board, grade)])
        or _pick(student.id, pool)
    )
    if chosen and student.mentor_teacher_id != chosen.id:
        student.mentor_teacher_id = chosen.id
        db.flush()
    return chosen


def students_of(db: Session, teacher: User) -> list[tuple[User, list[str], bool]]:
    """Every student this teacher sees: (student, subjects they teach them, is mentor)."""
    out = []
    students = db.scalars(select(User).where(User.role == "student", User.is_active.is_(True))).all()
    for s in students:
        board, grade = curriculum.normalise(s.board, s.grade)
        subjects = [
            a["subject"] for a in (teacher.teaching_json or [])
            if a.get("board") == board and str(a.get("grade")) == grade
            and subject_teacher(db, s, a["subject"]) is teacher
        ]
        is_mentor = mentor_of(db, s) is teacher
        if subjects or is_mentor:
            out.append((s, subjects, is_mentor))
    return out


# --------------------------------------------------------------------------
# Notifications
# --------------------------------------------------------------------------

def notify(db: Session, user_id: Optional[str], kind: str, title: str, body: str = "", link: Optional[str] = None) -> None:
    if not user_id:
        return
    db.add(Notification(user_id=user_id, kind=kind, title=title[:200], body=body, link=link))
    db.flush()


def notify_admins(db: Session, kind: str, title: str, body: str = "", link: Optional[str] = None) -> None:
    for a in db.scalars(select(User).where(User.role == "admin")).all():
        notify(db, a.id, kind, title, body, link)


# --------------------------------------------------------------------------
# Recorded-answer storage
# --------------------------------------------------------------------------

def media_dir() -> Path:
    d = settings.upload_root / "doubt_media"
    d.mkdir(parents=True, exist_ok=True)
    return d


def video_expiry():
    return utcnow() + timedelta(days=VIDEO_TTL_DAYS)


def purge_expired_media(db: Session) -> int:
    """Delete recorded answer videos past their expiry; keep the message as a tombstone."""
    now = utcnow()
    rows = db.scalars(
        select(DoubtMessage).where(DoubtMessage.expires_at.is_not(None), DoubtMessage.expires_at < now,
                                   DoubtMessage.attachment_path.is_not(None))
    ).all()
    for m in rows:
        try:
            Path(m.attachment_path).unlink(missing_ok=True)
        except OSError:
            logger.warning("Could not delete expired media %s", m.attachment_path)
        m.attachment_path = None
        m.meta = {**(m.meta or {}), "expired": True}
    if rows:
        db.flush()
        logger.info("Purged %d expired doubt video(s)", len(rows))
    return len(rows)
