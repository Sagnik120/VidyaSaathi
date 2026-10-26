"""End-to-end flows for the Classes 6-10 school features: syllabus path, doubts
routed to subject teachers, teacher desk, tests, games, notifications and roles."""
from datetime import timedelta
from pathlib import Path

import pytest

from modules.backend.src.config import settings
from modules.backend.src.db import base
from modules.backend.src.db.base import SessionLocal
from modules.backend.src.db.models import DoubtMessage, DoubtThread, Lesson, User, utcnow
from modules.backend.src.security import create_access_token, hash_password
from modules.backend.src.services import curriculum, school

API = "/api/v1"


def make_user(role="student", email=None, board="CBSE", grade="9", name=None, **extra):
    with SessionLocal() as db:
        u = User(email=email or f"{role}-{utcnow().timestamp()}@x.in", full_name=name or role.title(),
                 password_hash=hash_password("Passw0rd!x"), is_verified=True, role=role,
                 board=board if role == "student" else None, grade=grade if role == "student" else None, **extra)
        db.add(u)
        db.commit()
        db.refresh(u)
        return u


def hdr(u: User):
    return {"Authorization": f"Bearer {create_access_token(u.id, u.email, u.token_version)}"}


def teacher_of(subject, classes=(("CBSE", "9"),), name=None, mentor_of=None):
    return make_user("teacher", name=name or f"{subject} teacher",
                     teaching_json=[{"board": b, "grade": g, "subject": subject} for b, g in classes],
                     class_teacher_of=mentor_of or [])


def science_lesson(student: User) -> tuple[str, str]:
    topic = next(t for s in curriculum.tree("CBSE", "9") if s["name"] == "Science"
                 for c in s["chapters"] if c["title"] == "Motion" for t in c["topics"])
    with SessionLocal() as db:
        lesson = Lesson(user_id=student.id, title=topic["title"], topic=topic["title"], syllabus_topic_id=topic["id"])
        db.add(lesson)
        db.commit()
        return lesson.id, topic["id"]


# --------------------------------------------------------------------------
# Syllabus path
# --------------------------------------------------------------------------

def test_boards_are_public_and_cover_both_boards(client):
    r = client.get(f"{API}/curriculum/boards").json()
    assert r["boards"] == ["CBSE", "ICSE"] and r["grades"] == ["6", "7", "8", "9", "10"]
    assert "Physics" in r["subjects"]["ICSE"]["10"] and "Science" in r["subjects"]["CBSE"]["10"]


def test_path_is_deterministic_and_tracks_progress(client):
    s = make_user()
    first = client.get(f"{API}/curriculum/path", headers=hdr(s)).json()
    again = client.get(f"{API}/curriculum/path", headers=hdr(s)).json()
    assert first["configured"] and first == again
    maths = next(x for x in first["subjects"] if x["name"] == "Mathematics")
    t1, t2 = maths["chapters"][0]["topics"][:2]
    assert maths["next"]["id"] == t1["id"]
    assert client.post(f"{API}/curriculum/topics/{t1['id']}/complete", json={"done": True}, headers=hdr(s)).status_code == 200
    maths = next(x for x in client.get(f"{API}/curriculum/path", headers=hdr(s)).json()["subjects"] if x["name"] == "Mathematics")
    assert maths["next"]["id"] == t2["id"] and maths["done"] == 1
    # Topics can be started in any order, in any subject.
    sci = next(x for x in first["subjects"] if x["name"] == "Science")
    last = sci["chapters"][-1]["topics"][-1]
    client.post(f"{API}/curriculum/topics/{last['id']}/start", headers=hdr(s))
    sci = next(x for x in client.get(f"{API}/curriculum/path", headers=hdr(s)).json()["subjects"] if x["name"] == "Science")
    assert sci["started"] and sci["chapters"][-1]["topics"][-1]["state"] == "started"


def test_unknown_topic_is_404_and_unset_class_is_not_configured(client):
    s = make_user(board=None, grade=None)
    assert client.get(f"{API}/curriculum/path", headers=hdr(s)).json()["configured"] is False
    assert client.post(f"{API}/curriculum/topics/nope/start", headers=hdr(s)).status_code == 404


def test_signup_normalises_class_and_rejects_out_of_range(client):
    base_body = {"full_name": "Asha K", "password": "Asha2026!x", "board": "cbse"}
    ok = client.post(f"{API}/auth/signup", json={**base_body, "email": "a@x.in", "grade": "Class 7"})
    assert ok.status_code == 201
    bad = client.post(f"{API}/auth/signup", json={**base_body, "email": "b@x.in", "grade": "Class 12"})
    assert bad.status_code == 422


# --------------------------------------------------------------------------
# Doubts: agents, escalation to the SUBJECT teacher, teacher manager
# --------------------------------------------------------------------------

def test_doubt_goes_to_the_subject_teacher_after_three_tries(client):
    maths = teacher_of("Mathematics", name="Maths T", mentor_of=["CBSE-9"])
    science = teacher_of("Science", name="Science T")
    s = make_user(name="Riya")
    lesson_id, topic_id = science_lesson(s)

    t = client.post(f"{API}/doubts", json={"question": "Why is displacement different from distance?", "lesson_id": lesson_id,
                                           "concept": "Distance and displacement"}, headers=hdr(s)).json()
    assert t["status"] == "open" and t["subject"] == "Science" and t["chapter"] == "Motion"
    assert t["question"] == "Why is displacement different from distance?"
    ai = [m for m in t["messages"] if m["role"] == "ai"]
    assert len(ai) == 1 and ai[0]["meta"]["trace"] and ai[0]["meta"]["attempt"] == 1

    for attempt in (2, 3):
        t = client.post(f"{API}/doubts/{t['id']}/confused", headers=hdr(s)).json()
        assert t["status"] == "open" and t["ai_attempts"] == attempt
    t = client.post(f"{API}/doubts/{t['id']}/confused", headers=hdr(s)).json()
    assert t["status"] == "escalated" and t["teacher"]["id"] == science.id

    # The science teacher sees it; the maths teacher (also class teacher) does not.
    mine = client.get(f"{API}/doubts?status=escalated", headers=hdr(science)).json()
    assert mine["total"] == 1 and mine["threads"][0]["question"].startswith("Why is displacement")
    assert client.get(f"{API}/doubts", headers=hdr(maths)).json()["total"] == 0
    assert client.get(f"{API}/doubts/{t['id']}", headers=hdr(maths)).status_code == 404

    notes = client.get(f"{API}/notifications", headers=hdr(science)).json()
    assert notes["unread"] >= 1 and any(n["kind"] == "doubt" for n in notes["items"])


def test_doubt_manager_filters_stats_and_bulk_reply(client):
    science = teacher_of("Science", classes=(("CBSE", "9"), ("CBSE", "10")))
    a, b, c = make_user(name="Aman"), make_user(name="Bela"), make_user(name="Chetan", grade="10")
    ids = []
    for st, q in ((a, "What is acceleration?"), (b, "Acceleration negative?"), (c, "What is a covalent bond?")):
        t = client.post(f"{API}/doubts", json={"question": q, "subject": "Science", "topic": "Acceleration" if st is not c else "Covalent bonding"}, headers=hdr(st)).json()
        client.post(f"{API}/doubts/{t['id']}/escalate", headers=hdr(st))
        ids.append(t["id"])

    stats = client.get(f"{API}/doubts/stats", headers=hdr(science)).json()
    assert stats["open"] == 3 and stats["completed"] == 0
    assert {r["value"] for r in stats["classes"]} == {"CBSE-9", "CBSE-10"}
    assert stats["topics"][0] == {"value": "Acceleration", "count": 2}

    by_class = client.get(f"{API}/doubts?grade=9&board=CBSE", headers=hdr(science)).json()
    assert by_class["total"] == 2
    by_topic = client.get(f"{API}/doubts?topic=Acceleration&grade=9", headers=hdr(science)).json()
    assert by_topic["total"] == 2
    assert client.get(f"{API}/doubts?q=Bela", headers=hdr(science)).json()["total"] == 1
    assert client.get(f"{API}/doubts?limit=1", headers=hdr(science)).json()["threads"].__len__() == 1

    # One live class for everyone stuck on acceleration.
    r = client.post(f"{API}/doubts/bulk", json={"thread_ids": ids[:2], "kind": "live",
                                               "scheduled_at": (utcnow() + timedelta(days=1)).isoformat()}, headers=hdr(science))
    assert r.json()["updated"] == 2
    stats = client.get(f"{API}/doubts/stats", headers=hdr(science)).json()
    assert stats["open"] == 1 and stats["in_progress"] == 2
    t = client.get(f"{API}/doubts/{ids[0]}", headers=hdr(a)).json()
    live = [m for m in t["messages"] if m["kind"] == "live"]
    assert live and live[0]["meeting_url"].startswith("https://meet.jit.si/")
    # Students can't bulk-reply.
    assert client.post(f"{API}/doubts/bulk", json={"thread_ids": ids, "body": "x"}, headers=hdr(a)).status_code == 403

    client.post(f"{API}/doubts/{ids[0]}/understood", headers=hdr(a))
    assert client.get(f"{API}/doubts/stats", headers=hdr(science)).json()["completed"] == 1


def test_teacher_replies_with_notes_video_and_video_expires(client, tmp_path):
    science = teacher_of("Science")
    s = make_user()
    t = client.post(f"{API}/doubts", json={"question": "Explain inertia", "subject": "Science"}, headers=hdr(s)).json()
    client.post(f"{API}/doubts/{t['id']}/escalate", headers=hdr(s))
    r = client.post(f"{API}/doubts/{t['id']}/notes", data={"body": "See page 2"},
                    files={"file": ("notes.txt", b"inertia notes", "text/plain")}, headers=hdr(science))
    assert r.status_code == 200 and r.json()["status"] == "answered"
    r = client.post(f"{API}/doubts/{t['id']}/video", data={"body": "Watch"},
                    files={"file": ("ans.mp4", b"\x00\x00fakevideo", "video/mp4")}, headers=hdr(science))
    video = [m for m in r.json()["messages"] if m["kind"] == "video"][0]
    assert video["expires_at"] and video["has_attachment"]
    assert client.get(f"{API}/doubts/media/{video['id']}", headers=hdr(s)).status_code == 200
    # Another student can't fetch it.
    assert client.get(f"{API}/doubts/media/{video['id']}", headers=hdr(make_user())).status_code == 404
    # Expire and purge.
    with SessionLocal() as db:
        m = db.get(DoubtMessage, video["id"])
        path = Path(m.attachment_path)
        m.expires_at = utcnow() - timedelta(minutes=1)
        db.commit()
        assert school.purge_expired_media(db) == 1
        db.commit()
    assert not path.exists()
    assert client.get(f"{API}/doubts/media/{video['id']}", headers=hdr(s)).status_code == 410
    # Wrong teacher can't reply.
    assert client.post(f"{API}/doubts/{t['id']}/messages", json={"body": "hi"}, headers=hdr(teacher_of("English"))).status_code == 404


def test_free_topic_doubt_is_routed_by_its_words(client):
    maths = teacher_of("Mathematics")
    s = make_user()
    t = client.post(f"{API}/doubts", json={"question": "How do I use Heron's formula for a triangle?"}, headers=hdr(s)).json()
    assert t["subject"] == "Mathematics" and t["chapter"] == "Heron's Formula"
    t = client.post(f"{API}/doubts/{t['id']}/escalate", headers=hdr(s)).json()
    assert t["teacher"]["id"] == maths.id


def test_live_chat_between_student_and_teacher(client):
    teacher = teacher_of("English")
    s = make_user()
    chat = client.post(f"{API}/doubts/chat", json={"with_id": teacher.id}, headers=hdr(s)).json()
    assert chat["kind"] == "chat"
    assert client.post(f"{API}/doubts/chat", json={"with_id": teacher.id}, headers=hdr(s)).json()["id"] == chat["id"]
    client.post(f"{API}/doubts/{chat['id']}/messages", json={"body": "Hello ma'am"}, headers=hdr(s))
    back = client.post(f"{API}/doubts/{chat['id']}/messages", json={"body": "Hi!"}, headers=hdr(teacher)).json()
    assert [m["body"] for m in back["messages"]] == ["Hello ma'am", "Hi!"]
    # A chat never triggers the AI.
    assert not any(m["role"] == "ai" for m in back["messages"])


# --------------------------------------------------------------------------
# Teachers, roles, focus
# --------------------------------------------------------------------------

def test_teacher_is_one_subject_and_admin_is_separate(client):
    t = make_user("teacher")
    r = client.put(f"{API}/teacher/profile", json={"teaching": [{"board": "CBSE", "grade": "9", "subject": "Science"},
                                                                {"board": "CBSE", "grade": "9", "subject": "English"}]}, headers=hdr(t))
    assert r.status_code == 422
    r = client.put(f"{API}/teacher/profile", json={"teaching": [{"board": "CBSE", "grade": g, "subject": "Science"} for g in ("8", "9")]}, headers=hdr(t))
    assert r.status_code == 200
    assert client.get(f"{API}/admin/overview", headers=hdr(t)).status_code == 403
    admin = make_user("admin")
    assert client.get(f"{API}/admin/overview", headers=hdr(admin)).status_code == 200
    assert client.get(f"{API}/teacher/students", headers=hdr(make_user())).status_code == 403


def test_teacher_sees_students_sorted_by_who_needs_focus(client):
    teacher_of("Mathematics", mentor_of=["CBSE-9"])  # the class teacher
    science = teacher_of("Science", mentor_of=[])
    calm, stuck = make_user(name="Calm"), make_user(name="Stuck")
    for q in ("a?", "b?"):
        t = client.post(f"{API}/doubts", json={"question": f"Science question {q}", "subject": "Science"}, headers=hdr(stuck)).json()
        client.post(f"{API}/doubts/{t['id']}/escalate", headers=hdr(stuck))
    r = client.get(f"{API}/teacher/students?sort=focus", headers=hdr(science)).json()
    names = [x["full_name"] for x in r["students"]]
    assert names.index("Stuck") < names.index("Calm")
    top = r["students"][0]
    assert top["focus_score"] > 0 and any("waiting" in why for why in top["focus_reasons"])
    assert set(top["progress"]) == {"Science"}  # a subject teacher sees only their subject
    ov = client.get(f"{API}/teacher/overview", headers=hdr(science)).json()
    assert ov["subject"] == "Science" and ov["doubts"]["open"] == 2 and ov["focus"][0]["full_name"] == "Stuck"
    assert client.get(f"{API}/teacher/students?q=calm", headers=hdr(science)).json()["total"] == 1


def test_demo_seed_gives_each_subject_its_own_teacher(client, monkeypatch):
    monkeypatch.setattr(settings, "seed_default_users", True)
    base._seed_default_users()
    base._seed_default_users()  # idempotent
    with SessionLocal() as db:
        teachers = db.query(User).filter(User.role == "teacher").all()
        subjects = {t.teaching_json[0]["subject"] for t in teachers}
        assert len(teachers) == len(base.DEMO_TEACHERS) and "Science" in subjects and "Physics" in subjects
        assert all(len({x["subject"] for x in t.teaching_json}) == 1 for t in teachers)
        student = db.query(User).filter(User.email == "demo@vidyasaathi.in").one()
        for subject in curriculum.subjects_for("CBSE", "9"):
            assert school.subject_teacher(db, student, subject).teaching_json[0]["subject"] == subject
        assert db.query(User).filter(User.email == "admin@vidyasaathi.in").one().role == "admin"


# --------------------------------------------------------------------------
# Tests, leaderboards, games, help bot
# --------------------------------------------------------------------------

def _test_body(**over):
    body = {"board": "CBSE", "grade": "9", "subject": "Science", "title": "Motion quiz", "duration_min": 10, "questions": [
        {"text": "SI unit of speed?", "type": "mcq", "options": ["m/s", "km", "s"], "answer": [0], "topic": "Speed"},
        {"text": "Vectors?", "type": "msq", "options": ["velocity", "speed", "displacement"], "answer": [0, 2], "topic": "Vectors", "marks": 2},
    ]}
    body.update(over)
    return body


def test_class_test_flow_with_class_only_leaderboard_and_reports(client):
    science = teacher_of("Science")
    assert client.post(f"{API}/tests", json=_test_body(subject="English"), headers=hdr(science)).status_code == 403
    t = client.post(f"{API}/tests", json=_test_body(), headers=hdr(science)).json()
    a, b, other = make_user(name="A"), make_user(name="B"), make_user(name="Other", grade="8")
    assert client.get(f"{API}/tests", headers=hdr(other)).json()["tests"] == []
    assert "answer" not in client.get(f"{API}/tests/{t['id']}", headers=hdr(a)).json()["questions"][0]
    qa, qb = t["questions"][0]["id"], t["questions"][1]["id"]
    ra = client.post(f"{API}/tests/{t['id']}/submit", json={"answers": {qa: [0], qb: [0, 2]}, "time_taken_sec": 60}, headers=hdr(a)).json()
    assert ra["test"]["attempt"]["pct"] == 100 and ra["rank"] == 1
    rb = client.post(f"{API}/tests/{t['id']}/submit", json={"answers": {qa: [1], qb: [0]}, "time_taken_sec": 30}, headers=hdr(b)).json()
    assert rb["test"]["attempt"]["score"] == 0.5  # MSQ partial credit only
    assert rb["weak_topics"] == ["Speed", "Vectors"] and rb["rank"] == 2
    assert client.post(f"{API}/tests/{t['id']}/submit", json={"answers": {}}, headers=hdr(b)).status_code == 409
    assert client.post(f"{API}/tests/{t['id']}/submit", json={"answers": {}}, headers=hdr(other)).status_code == 403
    board = client.get(f"{API}/tests/{t['id']}/leaderboard", headers=hdr(b)).json()
    assert [r["full_name"] for r in board["rows"]] == ["A", "B"] and board["me"]["rank"] == 2
    rep = client.get(f"{API}/tests/{t['id']}/report", headers=hdr(science)).json()
    assert rep["class"]["attempts"] == 2 and rep["needs_help"][0]["full_name"] == "B"
    assert "Other" not in rep["not_attempted"]


def test_games_award_points_and_rank_within_the_class(client):
    a, b, other = make_user(name="A"), make_user(name="B"), make_user(name="Z", grade="7")
    r = client.post(f"{API}/games/score", json={"subject": "Science", "topic": "Motion", "game": "quiz", "correct": 10, "total": 10, "streak": 10}, headers=hdr(a)).json()
    assert r["points"] == 10 * 10 + 10 * 2 + 20
    client.post(f"{API}/games/score", json={"subject": "Science", "game": "match", "correct": 2, "total": 5}, headers=hdr(b))
    client.post(f"{API}/games/score", json={"subject": "Science", "game": "quiz", "correct": 10, "total": 10}, headers=hdr(other))
    rows = client.get(f"{API}/games/leaderboard?subject=Science", headers=hdr(b)).json()["rows"]
    assert [r["full_name"] for r in rows] == ["A", "B"]


@pytest.mark.parametrize("role,msg,expect", [
    ("student", "how do I ask a doubt", "/doubts"),
    ("teacher", "how do I create a test", "/teacher?tab=tests"),
    ("admin", "assign a class teacher", "/admin?tab=teachers"),
])
def test_help_bot_knows_where_things_are_for_each_role(client, role, msg, expect):
    u = make_user(role)
    r = client.post(f"{API}/help/chat", json={"message": msg}, headers=hdr(u)).json()
    assert r["link"] == expect and r["reply"]


def test_help_bot_for_visitors_and_jokes(client):
    r = client.post(f"{API}/help/chat", json={"message": "hello"}).json()
    assert "Mor" in r["reply"]
    assert client.post(f"{API}/help/chat", json={"message": "tell me a joke"}).json()["reply"]


def test_notifications_mark_read(client):
    s = make_user()
    with SessionLocal() as db:
        school.notify(db, s.id, "test", "One")
        school.notify(db, s.id, "test", "Two")
        db.commit()
    n = client.get(f"{API}/notifications", headers=hdr(s)).json()
    assert n["unread"] == 2
    client.post(f"{API}/notifications/read", json={"ids": [n["items"][0]["id"]]}, headers=hdr(s))
    assert client.get(f"{API}/notifications", headers=hdr(s)).json()["unread"] == 1
    client.post(f"{API}/notifications/read", json={}, headers=hdr(s))
    assert client.get(f"{API}/notifications", headers=hdr(s)).json()["unread"] == 0


# --------------------------------------------------------------------------
# Gyaan Yatra journey, coins, separate leaderboards, notification removal
# --------------------------------------------------------------------------

def test_journey_unlocks_stage_by_stage_and_awards_stars(client):
    s = make_user()
    j = client.get(f"{API}/games/journey?subject=Science", headers=hdr(s)).json()
    stages = [st for lv in j["levels"] for st in lv["stages"]]
    assert len(j["levels"]) == 4 and stages[0]["unlocked"] and not stages[1]["unlocked"]
    assert {st["game"] for st in stages} >= {"quiz", "truefalse", "match", "oddone"}
    second = {"subject": "Science", "topic_id": stages[1]["id"], "correct": 5, "total": 5, "hearts_left": 3}
    assert client.post(f"{API}/games/journey/complete", json=second, headers=hdr(s)).status_code == 409  # locked
    fail = client.post(f"{API}/games/journey/complete", json={**second, "topic_id": stages[0]["id"], "correct": 1, "hearts_left": 0}, headers=hdr(s)).json()
    assert fail["stars"] == 0 and not fail["cleared"] and fail["next"] is None
    win = client.post(f"{API}/games/journey/complete", json={**second, "topic_id": stages[0]["id"]}, headers=hdr(s)).json()
    assert win["stars"] == 3 and win["next"]["id"] == stages[1]["id"]
    ok = client.post(f"{API}/games/journey/complete", json={**second, "hearts_left": 2, "hints_used": 1}, headers=hdr(s)).json()
    assert ok["stars"] == 1
    assert client.get(f"{API}/games/journey?subject=Physics", headers=hdr(s)).status_code == 404  # not a CBSE subject


def test_hints_cost_coins_and_cannot_overspend(client):
    s = make_user()
    assert client.post(f"{API}/games/spend", json={"coins": 5}, headers=hdr(s)).status_code == 409
    client.post(f"{API}/games/score", json={"subject": "Science", "game": "quiz", "correct": 2, "total": 4}, headers=hdr(s))
    r = client.post(f"{API}/games/spend", json={"coins": 5}, headers=hdr(s)).json()
    assert r["coins"] == 15 and client.get(f"{API}/games/wallet", headers=hdr(s)).json()["coins"] == 15


def test_game_and_test_leaderboards_are_separate(client):
    science = teacher_of("Science")
    gamer, tester = make_user(name="Gamer"), make_user(name="Tester")
    client.post(f"{API}/games/score", json={"subject": "Science", "game": "quiz", "correct": 10, "total": 10}, headers=hdr(gamer))
    t = client.post(f"{API}/tests", json=_test_body(), headers=hdr(science)).json()
    q = t["questions"]
    client.post(f"{API}/tests/{t['id']}/submit", json={"answers": {q[0]["id"]: [0], q[1]["id"]: [0, 2]}, "time_taken_sec": 40}, headers=hdr(tester))
    games = client.get(f"{API}/games/leaderboard", headers=hdr(tester)).json()
    assert games["rows"][0]["full_name"] == "Gamer" and games["rows"][0]["tier"] == "Bronze" and games["me"]["points"] == 0
    assert games["gap"]["name"] == "Gamer"
    tests = client.get(f"{API}/tests/leaderboard/class", headers=hdr(gamer)).json()
    assert tests["rows"][0]["full_name"] == "Tester" and tests["rows"][0]["pct"] == 100 and tests["me"]["pct"] is None


def test_test_leaderboard_breaks_ties_by_time_and_is_provisional(client):
    science = teacher_of("Science")
    slow, fast, late = make_user(name="Slow"), make_user(name="Fast"), make_user(name="Late")
    t = client.post(f"{API}/tests", json=_test_body(), headers=hdr(science)).json()
    q = t["questions"]
    perfect = {q[0]["id"]: [0], q[1]["id"]: [0, 2]}
    client.post(f"{API}/tests/{t['id']}/submit", json={"answers": perfect, "time_taken_sec": 300}, headers=hdr(slow))
    client.post(f"{API}/tests/{t['id']}/submit", json={"answers": perfect, "time_taken_sec": 90}, headers=hdr(fast))
    b = client.get(f"{API}/tests/{t['id']}/leaderboard", headers=hdr(slow)).json()
    assert [r["full_name"] for r in b["rows"]] == ["Fast", "Slow"] and b["final"] is False and b["class_size"] == 3
    client.post(f"{API}/tests/{t['id']}/submit", json={"answers": {}, "time_taken_sec": 10}, headers=hdr(late))
    assert client.get(f"{API}/tests/{t['id']}/leaderboard", headers=hdr(slow)).json()["final"] is True


def test_notifications_can_be_removed_one_by_one_or_cleared(client):
    s, other = make_user(), make_user()
    with SessionLocal() as db:
        for i in range(3):
            school.notify(db, s.id, "test", f"N{i}")
        school.notify(db, other.id, "test", "theirs")
        db.commit()
    items = client.get(f"{API}/notifications", headers=hdr(s)).json()["items"]
    theirs = client.get(f"{API}/notifications", headers=hdr(other)).json()["items"][0]["id"]
    assert client.delete(f"{API}/notifications/{theirs}", headers=hdr(s)).status_code == 404
    assert client.delete(f"{API}/notifications/{items[0]['id']}", headers=hdr(s)).json()["ok"]
    client.post(f"{API}/notifications/read", json={"ids": [items[1]["id"]]}, headers=hdr(s))
    assert client.delete(f"{API}/notifications", headers=hdr(s)).json()["removed"] == 1  # read only
    assert client.delete(f"{API}/notifications?read_only=false", headers=hdr(s)).json()["removed"] == 1
    assert client.get(f"{API}/notifications", headers=hdr(s)).json()["items"] == []
