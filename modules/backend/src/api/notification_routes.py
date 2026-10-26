"""The notification bell, and "Mor" — the website's friendly help bot."""
import json
import random
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from modules.backend.src.db.base import get_db
from modules.backend.src.db.models import Notification, User, utcnow
from modules.backend.src.deps import get_current_user, get_optional_user

router = APIRouter(tags=["notifications"])


@router.get("/notifications")
def notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    rows = db.scalars(select(Notification).where(Notification.user_id == user.id)
                      .order_by(Notification.created_at.desc()).limit(50)).all()
    unread = db.scalar(select(func.count()).select_from(Notification)
                       .where(Notification.user_id == user.id, Notification.read_at.is_(None))) or 0
    return {"unread": unread, "items": [
        {"id": n.id, "kind": n.kind, "title": n.title, "body": n.body, "link": n.link,
         "read": n.read_at is not None, "created_at": n.created_at.isoformat()} for n in rows]}


class ReadIn(BaseModel):
    ids: Optional[list[str]] = None  # None = mark all read


@router.post("/notifications/read")
def mark_read(payload: ReadIn, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    q = update(Notification).where(Notification.user_id == user.id, Notification.read_at.is_(None))
    if payload.ids:
        q = q.where(Notification.id.in_(payload.ids))
    db.execute(q.values(read_at=utcnow()))
    return {"ok": True}


@router.delete("/notifications/{notification_id}")
def remove_notification(notification_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    """Remove one notification — only the owner's own."""
    n = db.get(Notification, notification_id)
    if not n or n.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found.")
    db.delete(n)
    return {"ok": True}


@router.delete("/notifications")
def clear_notifications(read_only: bool = True, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    """Clear the bell: read ones by default, or everything with read_only=false."""
    q = delete(Notification).where(Notification.user_id == user.id)
    if read_only:
        q = q.where(Notification.read_at.is_not(None))
    removed = db.execute(q).rowcount or 0
    return {"removed": removed}


# --------------------------------------------------------------------------
# Mor the peacock: answers "where do I do what" for students, teachers, admins
# --------------------------------------------------------------------------

# (keywords, roles, answer, link, link label). Order matters: first match wins.
_FAQ = [
    (r"\b(doubt|stuck|don'?t understand|confus|ask)\b", ("student",),
     "Stuck? 🦚 While a video plays, tap the **Ask a doubt** button (bottom-right of the classroom). My doubt-agent friends answer in seconds. "
     "Still confused after 3 tries? It goes straight to your subject teacher, who can reply with notes, a video, or a live class!",
     "/doubts", "My doubts"),
    (r"\b(path|syllabus|chapter|topic|subject|what next|start)\b", ("student",),
     "Your **Learning path** shows your board's syllabus: Subjects → Chapters → Topics, in textbook order. Start any topic, any subject, "
     "or just hit **Continue** to go to the next one. Your progress is saved automatically ✅",
     "/path", "Open learning path"),
    (r"\b(game|play|points|fun)\b", ("student",),
     "Games time! 🎮 Open **Practice Lab → Games**, pick a subject and topic, and play Quiz Rush, True/False Blitz or Match-up. "
     "Every right answer earns points for your class leaderboard.",
     "/lab?tab=games", "Play games"),
    (r"\b(simulat|lab|experiment)\b", ("student", "teacher", "admin"),
     "The **Practice Lab** has hands-on simulations for your class and subject: circuits, lenses, fractions, graphs, pH and more. "
     "Move the sliders, predict, and see what happens 🔬",
     "/lab", "Open Practice Lab"),
    (r"\b(test|exam|quiz|leaderboard|rank)\b", ("student",),
     "Your teachers' tests live in **Tests**. Finish one to see your score, rank in your class, and a detailed report of which topics to revise 🏆",
     "/tests", "My tests"),
    (r"\b(teacher|mentor|chat|message)\b", ("student",),
     "Every subject has a teacher, and you have a class teacher who watches your overall progress. Open **My doubts** to chat with them live 💬",
     "/doubts", "Chat with teachers"),
    (r"\b(notification|bell|alert)\b", ("student", "teacher", "admin"),
     "The 🔔 bell at the top shows everything important: teacher replies, new tests, live classes, escalated doubts. A dot means something new!",
     None, None),
    (r"\b(board|class|grade|cbse|icse|profile|change)\b", ("student",),
     "You can change your board (CBSE / ICSE) and class anytime in **Profile**. Your learning path updates to match instantly.",
     "/profile", "Open profile"),
    (r"\b(language|hindi|english)\b", ("student", "teacher", "admin"),
     "Switch between English and हिन्दी with the language toggle — lessons, the website and even my answers follow along 🇮🇳",
     None, None),
    (r"\b(test|exam|quiz|mcq|msq|create)\b", ("teacher",),
     "Open **Tests** in your desk → **New test**. Pick class & subject, add MCQ (one answer) or MSQ (many answers) questions, publish. "
     "Students in that class get notified; you get a full report: who's doing well, who's falling behind, and on which topics.",
     "/teacher?tab=tests", "Tests"),
    (r"\b(doubt|reply|video|notes|live|escalat)\b", ("teacher",),
     "Doubts the AI couldn't solve land in **Doubts**. Reply with text, upload notes, record a video (auto-deleted after 7 days to save space), "
     "or schedule a live class with a meeting link — the student is notified each time.",
     "/teacher?tab=doubts", "Doubts inbox"),
    (r"\b(student|progress|class|subject|report)\b", ("teacher",),
     "**My students** shows everyone you teach, filterable by subject and class, with syllabus progress, test averages and open doubts. "
     "Tap a student for their full report. Your mentees (class teacher) show their overall progress.",
     "/teacher?tab=students", "My students"),
    (r"\b(teach|subject|assign|profile|setup)\b", ("teacher",),
     "Set what you teach in **My students → Teaching profile**: board, class and subject, plus classes you're class teacher of. "
     "Students are matched to you automatically.",
     "/teacher?tab=students", "Teaching profile"),
    (r"\b(teacher|assign|mentor|reassign)\b", ("admin",),
     "Admins see every teacher and their load in **Teachers**, and can reassign a student's class teacher there.",
     "/admin?tab=teachers", "Teachers"),
    (r"\b(overview|stats|health|quality|live)\b", ("admin", "teacher"),
     "**Overview** shows learning at a glance; **Live** shows classrooms in progress; admins also get AI quality and system health.",
     "/admin?tab=overview", "Overview"),
    (r"\b(sign ?up|register|account|login|password)\b", ("guest", "student", "teacher", "admin"),
     "Students sign up with their board (CBSE/ICSE) and class (6-10). Teachers and admins use the staff sign-up with their school's access code. "
     "Forgot your password? There's a reset link on the sign-in page.",
     "/signup", "Sign up"),
]

_JOKES = [
    "Why did the student bring a ladder to class? To reach the *higher* marks! 🪜",
    "Why was the math book sad? It had too many problems 📚😢",
    "What do you call a peacock who loves maths? A *pea-calculator* 🦚🧮",
    "Why did the photon skip the hotel? It was travelling light ✨",
]

_GREETS = ["Namaste! 🙏 I'm **Mor**, VidyaSaathi's peacock guide. Ask me where anything is!",
           "Hi hi! 🦚 Mor here — your guide to VidyaSaathi. What are you looking for?"]


class HelpIn(BaseModel):
    message: str = Field(min_length=1, max_length=600)
    lang: str = Field(default="en", max_length=10)
    page: Optional[str] = Field(default=None, max_length=200)


def _llm(msg: str, role: str, lang: str) -> Optional[str]:
    try:
        from modules.ai_agent_orchestration.src.adapters.gemini_adapter import SmartMockLLMAdapter, get_llm_adapter
        adapter = get_llm_adapter()
        if isinstance(adapter, SmartMockLLMAdapter):
            return None
        guide = "\n".join(f"- {a}" for _, roles, a, _, _ in _FAQ if role in roles or role == "guest")
        raw = adapter.complete([
            {"role": "system", "content": (
                "You are Mor, the cheerful peacock mascot of VidyaSaathi, an adaptive learning website for Indian "
                f"Class 6-10 students (CBSE and ICSE). You're talking to a {role}. Be warm, funny and short (max 80 words), "
                "use an emoji or two, and only describe features listed in this guide:\n" + guide +
                f"\nReply in {'Hindi' if lang == 'hi' else 'English'}. Return JSON: {{\"reply\": \"...\"}}")},
            {"role": "user", "content": msg},
        ])
        data = json.loads(re.sub(r"^```(json)?|```$", "", raw.strip()).strip())
        return str(data.get("reply") or "").strip() or None
    except Exception:
        return None


@router.post("/help/chat")
def help_chat(payload: HelpIn, user: Optional[User] = Depends(get_optional_user)):
    role = user.role if user else "guest"
    text = payload.message.lower()
    if re.search(r"\b(joke|funny|bored|laugh)\b", text):
        return {"reply": random.choice(_JOKES), "link": None, "label": None}
    if re.fullmatch(r"\W*(hi|hello|hey|namaste|hii+|yo)\W*", text):
        return {"reply": random.choice(_GREETS), "link": None, "label": None}
    for pattern, roles, answer, link, label in _FAQ:
        if (role in roles or (role == "guest" and "student" in roles)) and re.search(pattern, text):
            return {"reply": answer, "link": link if user or link == "/signup" else "/signup", "label": label if user or link == "/signup" else "Sign up"}
    llm = _llm(payload.message, role, payload.lang)
    if llm:
        return {"reply": llm, "link": None, "label": None}
    return {"reply": "Hmm, my feathers are ruffled 🦚 — I'm not sure about that one. Try asking about *doubts*, *learning path*, *games*, "
                     "*tests*, *simulations* or *notifications*!", "link": None, "label": None}
