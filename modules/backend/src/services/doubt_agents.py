"""Doubt agents: answer a student's question asked mid-lesson.

A small team, each with one job, run in order on every question:

  Listener   - what kind of doubt is this (meaning, why, how-to, example, numerical)?
  Librarian  - where it sits: board, class, subject, chapter, and what the
               current lesson segment actually said (script + notes).
  Tutor      - explains it at the student's class level, simpler on each retry
               (attempt 1: direct; 2: step by step with an Indian everyday
               example; 3: the most basic picture, building from the prerequisite).
  Checker    - ends with one tiny question so the student can test themselves.
  Escalator  - after MAX_AI_TRIES "still confused" replies, hands the doubt to
               the subject teacher (with the whole conversation) and notifies them.

Gemini writes the explanation when a key is configured; otherwise (or if it
fails) the Tutor builds one from the lesson's own notes, so it always answers.
"""
import json
import logging
import re
from typing import Optional

from sqlalchemy.orm import Session

from modules.backend.src.db.models import DoubtMessage, DoubtThread, Lesson, LessonNodeRow, User, utcnow
from modules.backend.src.services import curriculum, school

logger = logging.getLogger(__name__)

MAX_AI_TRIES = 3

_KINDS = [
    ("numerical", r"\b(solve|calculate|find|how much|how many|value of|=|\d+\s*[\+\-\*/x×÷]\s*\d+)"),
    ("why", r"\b(why|reason|kyun|kyon|क्यों)\b"),
    ("how", r"\b(how|steps|method|process|kaise|कैसे)\b"),
    ("example", r"\b(example|instance|real life|daily life|udaharan|उदाहरण)\b"),
    ("meaning", r"\b(what is|what are|meaning|define|definition|kya hai|क्या है|matlab)\b"),
]

_STYLE = {
    1: "Answer directly and clearly in 3-5 short sentences.",
    2: "The student did not understand the first answer. Explain again step by step (numbered steps), "
       "using an everyday example from Indian life (cricket, a kirana shop, a train, rotis, festivals, monsoon).",
    3: "The student is still confused. Start from the most basic idea the topic depends on, use a very simple "
       "picture/analogy, and keep every sentence short. No jargon.",
}


def listener(question: str) -> str:
    q = question.lower()
    for kind, pattern in _KINDS:
        if re.search(pattern, q):
            return kind
    return "concept"


def librarian(db: Session, student: User, thread: DoubtThread) -> dict:
    ctx = {"board": student.board, "grade": student.grade, "subject": thread.subject, "topic": thread.topic,
           "chapter": None, "script": "", "key_points": []}
    lesson = db.get(Lesson, thread.lesson_id) if thread.lesson_id else None
    if lesson is not None:
        found = curriculum.find_topic(lesson.syllabus_topic_id)
        if found:
            _, _, subject, chapter, topic = found
            ctx.update(subject=subject["name"], chapter=chapter["title"], topic=topic["title"])
        ctx["topic"] = ctx["topic"] or lesson.topic or lesson.title
        node: Optional[LessonNodeRow] = None
        if thread.node_id:
            node = next((n for n in lesson.nodes if n.node_id == thread.node_id), None)
        node = node or next((n for n in lesson.nodes if n.status in ("teaching", "questioning")), None)
        if node is not None:
            ctx["concept"] = node.concept
            ctx["script"] = (node.script_text or "")[:2500]
            ctx["key_points"] = list((node.notes_json or {}).get("key_points") or [])[:6]
            ctx["example"] = (node.notes_json or {}).get("example")
    return ctx


def stamp(db: Session, student: User, thread: DoubtThread, question: Optional[str] = None) -> dict:
    """Record where the doubt sits (class, subject, chapter, topic) so teachers can filter by it."""
    ctx = librarian(db, student, thread)
    lesson = db.get(Lesson, thread.lesson_id) if thread.lesson_id else None
    thread.board, thread.grade = curriculum.normalise(student.board, student.grade)
    thread.subject = thread.subject or ctx.get("subject")
    thread.chapter = (thread.chapter or ctx.get("chapter") or "")[:300] or None
    thread.topic = (thread.topic or ctx.get("topic") or "")[:300] or None
    if lesson is not None and lesson.syllabus_topic_id:
        thread.syllabus_topic_id = lesson.syllabus_topic_id
    if not thread.subject:
        guess = curriculum.guess_place(student.board, student.grade, " ".join(filter(None, [question, thread.topic, ctx.get("concept")])))
        if guess:
            thread.subject, thread.chapter = guess["subject"], thread.chapter or guess["chapter"]
            thread.topic = thread.topic or guess["topic"]
            thread.syllabus_topic_id = thread.syllabus_topic_id or guess["topic_id"]
    if question and not thread.question:
        thread.question = question.strip()[:4000]
    return ctx


def _llm_tutor(question: str, kind: str, attempt: int, ctx: dict, history: list[dict], lang: str) -> Optional[dict]:
    try:
        from modules.ai_agent_orchestration.src.adapters.gemini_adapter import SmartMockLLMAdapter, get_llm_adapter
        adapter = get_llm_adapter()
        if isinstance(adapter, SmartMockLLMAdapter):
            return None
        where = ", ".join(x for x in [ctx.get("board"), f"Class {ctx['grade']}" if ctx.get("grade") else None,
                                      ctx.get("subject"), ctx.get("chapter"), ctx.get("topic")] if x)
        system = (
            "You are VidyaSaathi's doubt-solving tutor for Indian school students (Classes 6-10). "
            f"The student is studying: {where or 'their school syllabus'}. Stay within their board syllabus and class level. "
            f"Doubt type: {kind}. {_STYLE[min(attempt, 3)]} "
            f"Reply in {'simple Hindi (Devanagari)' if lang == 'hi' else 'simple English'}. "
            'Return JSON only: {"answer": "<explanation, markdown allowed>", "check": "<one short self-check question>", '
            '"check_answer": "<its answer>"}.'
        )
        lesson = ""
        if ctx.get("script"):
            lesson = f"What the video lesson said:\n{ctx['script']}\n"
        if ctx.get("key_points"):
            lesson += "Key points: " + "; ".join(ctx["key_points"]) + "\n"
        messages = [{"role": "system", "content": system}]
        for h in history[-6:]:
            messages.append({"role": "assistant" if h["role"] == "ai" else "user", "content": h["body"][:1500]})
        messages.append({"role": "user", "content": f"{lesson}\nStudent's doubt: {question}"})
        raw = adapter.complete(messages)
        data = json.loads(re.sub(r"^```(json)?|```$", "", raw.strip()).strip())
        if isinstance(data, dict) and str(data.get("answer", "")).strip():
            return {"answer": str(data["answer"]).strip(), "check": str(data.get("check") or "").strip(),
                    "check_answer": str(data.get("check_answer") or "").strip(), "engine": "gemini"}
    except Exception as exc:
        logger.info("Doubt tutor LLM unavailable, using lesson notes: %s", exc)
    return None


def _offline_tutor(question: str, kind: str, attempt: int, ctx: dict, lang: str) -> dict:
    hi = lang == "hi"
    topic = ctx.get("concept") or ctx.get("topic") or ("यह विषय" if hi else "this topic")
    points = ctx.get("key_points") or []
    sentences = [s.strip() for s in re.split(r"(?<=[.!?।])\s+", ctx.get("script") or "") if len(s.strip()) > 30]
    # Pick the lesson sentences that share the most words with the question.
    words = {w for w in re.findall(r"[a-zA-Zऀ-ॿ]{4,}", question.lower())}
    ranked = sorted(sentences, key=lambda s: -len(words & set(re.findall(r"[a-zA-Zऀ-ॿ]{4,}", s.lower()))))
    best = ranked[:3] if attempt == 1 else ranked[:5]

    if attempt == 1:
        lead = (f"**{topic}** — आपके सवाल का सीधा जवाब:" if hi else f"Here's the short answer about **{topic}**:")
        body = " ".join(best) or (" ".join(points[:3]) if points else "")
    elif attempt == 2:
        lead = "चलिए इसे कदम-दर-कदम समझते हैं:" if hi else "Let's go step by step:"
        steps = (points or best)[:4]
        body = "\n".join(f"{i}. {s}" for i, s in enumerate(steps, 1))
        if ctx.get("example"):
            body += f"\n\n{'उदाहरण' if hi else 'Example'}: {ctx['example']}"
    else:
        lead = "सबसे आसान तरीके से:" if hi else "The simplest way to see it:"
        body = (points or best or [""])[0]
    if not body.strip():
        # No lesson notes to draw on (and no LLM): be honest and useful instead of vague.
        where = " → ".join(x for x in [ctx.get("subject"), ctx.get("chapter"), ctx.get("topic")] if x)
        if hi:
            body = (f"यह सवाल **{where or topic}** से जुड़ा है।\n\n1. पाठ्यपुस्तक में इस टॉपिक की परिभाषा और पहला हल किया उदाहरण दोबारा पढ़ें।\n"
                    "2. अपने सवाल का कौन-सा शब्द उलझा रहा है, उसे लिखें।\n3. एक छोटा उदाहरण खुद बनाकर देखें।"
                    + ("\n\nफिर भी उलझन? 'अभी भी उलझन' दबाएँ — आपके विषय शिक्षक जवाब देंगे।" if attempt < MAX_AI_TRIES else ""))
        else:
            body = (f"This sits in **{where or topic}**.\n\n1. Re-read the definition and the first solved example for this topic in your textbook.\n"
                    "2. Note the exact word or step that confuses you.\n3. Try one tiny example of your own."
                    + ("\n\nStill stuck? Tap \"Still confused\" and your subject teacher will step in." if attempt < MAX_AI_TRIES else ""))
    check = (f"अपने शब्दों में बताइए: {topic} क्या है?" if hi else f"In one line, how would you explain {topic} to a friend?")
    return {"answer": f"{lead}\n\n{body}", "check": check, "check_answer": "", "engine": "lesson-notes"}


def answer(db: Session, student: User, thread: DoubtThread, question: str, lang: str = "en") -> DoubtMessage:
    """Run the agents on a new question (or a "still confused" retry) and store the reply."""
    thread.ai_attempts += 1
    attempt = min(thread.ai_attempts, MAX_AI_TRIES)
    kind = listener(question)
    ctx = librarian(db, student, thread)
    history = [{"role": m.role, "body": m.body} for m in thread.messages if m.role in ("student", "ai")]
    reply = _llm_tutor(question, kind, attempt, ctx, history, lang) or _offline_tutor(question, kind, attempt, ctx, lang)
    if not thread.subject and ctx.get("subject"):
        thread.subject = ctx["subject"]
    if not thread.topic and ctx.get("topic"):
        thread.topic = ctx["topic"][:300]

    trace = [
        {"agent": "Listener", "did": f"Read your doubt as a '{kind}' question"},
        {"agent": "Librarian", "did": " → ".join(x for x in [ctx.get("subject"), ctx.get("chapter"), ctx.get("concept") or ctx.get("topic")] if x) or "Looked up your lesson"},
        {"agent": "Tutor", "did": ["Direct answer", "Step-by-step with an example", "Back to basics"][attempt - 1]},
        {"agent": "Checker", "did": "Added a quick self-check"},
    ]
    msg = DoubtMessage(
        thread_id=thread.id, role="ai", kind="text", body=reply["answer"],
        meta={"attempt": attempt, "kind": kind, "engine": reply["engine"], "check": reply["check"],
              "check_answer": reply["check_answer"], "trace": trace, "max_tries": MAX_AI_TRIES},
    )
    db.add(msg)
    thread.status = "open"
    db.flush()
    return msg


def escalate(db: Session, student: User, thread: DoubtThread, reason: str = "auto") -> Optional[User]:
    """Hand the doubt to the subject teacher, with the conversation attached."""
    teacher = school.subject_teacher(db, student, thread.subject)
    thread.teacher_id = teacher.id if teacher else None
    thread.status = "escalated"
    thread.escalated_at = utcnow()
    note = ("The doubt agents couldn't clear this up after several tries, so it's been sent to "
            f"{teacher.full_name if teacher else 'a teacher'}." if reason == "auto"
            else f"Sent to {teacher.full_name if teacher else 'a teacher'} as you asked.")
    db.add(DoubtMessage(thread_id=thread.id, role="system", kind="text", body=note,
                        meta={"escalated_to": teacher.full_name if teacher else None, "reason": reason}))
    where = " · ".join(x for x in [thread.subject, thread.topic] if x)
    if teacher:
        school.notify(db, teacher.id, "doubt", f"New doubt from {student.full_name}",
                      f"{where}. The AI tried {thread.ai_attempts}× — they need you.", f"/teacher?tab=doubts&thread={thread.id}")
    else:
        school.notify_admins(db, "doubt", f"Unassigned doubt from {student.full_name}",
                             f"{where}. No teacher teaches this subject yet.", f"/admin?tab=doubts&thread={thread.id}")
    school.notify(db, student.id, "doubt", "Your doubt went to a teacher",
                  f"{teacher.full_name if teacher else 'A teacher'} will reply here soon.", f"/doubts?thread={thread.id}")
    db.flush()
    return teacher
