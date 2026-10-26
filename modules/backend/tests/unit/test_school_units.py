"""Unit tests for the deterministic pieces: syllabus tree, subject guessing,
MSQ grading, the doubt tutor's retry ladder and the focus score."""
from datetime import timedelta
from types import SimpleNamespace

from modules.backend.src.api.curriculum_routes import _focus
from modules.backend.src.api.test_routes import _grade
from modules.backend.src.db.models import utcnow
from modules.backend.src.services import curriculum, doubt_agents
from modules.backend.src.services.syllabus_data import SYLLABUS


def test_every_class_has_chapters_with_topics_and_unique_ids():
    seen = set()
    for board in curriculum.BOARDS:
        for grade in curriculum.GRADES:
            subjects = curriculum.tree(board, grade)
            assert subjects, (board, grade)
            for s in subjects:
                for c in s["chapters"]:
                    assert c["topics"], (board, grade, s["name"], c["title"])
                    for t in c["topics"]:
                        assert t["id"] not in seen
                        seen.add(t["id"])
    assert len(seen) > 1500


def test_tree_order_follows_the_textbook():
    maths = next(s for s in curriculum.tree("CBSE", "10") if s["name"] == "Mathematics")
    assert maths["chapters"][0]["title"] == "Real Numbers"
    assert maths["chapters"][-1]["title"] == "Probability"
    assert set(SYLLABUS["ICSE"]["9"]) >= {"Physics", "Chemistry", "Biology"}


def test_normalise_and_find_topic():
    assert curriculum.normalise("icse", "Class 10") == ("ICSE", "10")
    assert curriculum.normalise("state", "12") == (None, None)
    tid = curriculum.tree("CBSE", "6")[0]["chapters"][0]["topics"][0]["id"]
    board, grade, subject, chapter, topic = curriculum.find_topic(tid)
    assert (board, grade, subject["name"]) == ("CBSE", "6", "Mathematics")


def test_guess_place_routes_free_text_to_the_right_subject():
    assert curriculum.guess_place("CBSE", "10", "I don't get Ohm's law and resistance")["subject"] == "Science"
    assert curriculum.guess_place("CBSE", "10", "nth term of an arithmetic progression")["subject"] == "Mathematics"
    assert curriculum.guess_place("ICSE", "10", "refraction through a convex lens")["subject"] == "Physics"
    assert curriculum.guess_place("CBSE", "9", "zzzz qqqq") is None


def test_msq_partial_credit_and_mcq_all_or_nothing():
    mcq = {"type": "mcq", "answer": [1], "marks": 1}
    msq = {"type": "msq", "answer": [0, 2], "marks": 2}
    assert _grade(mcq, [1]) == 1 and _grade(mcq, [0]) == 0
    assert _grade(msq, [0, 2]) == 2
    assert _grade(msq, [0]) == 0.5           # half the right picks, half credit, halved again
    assert _grade(msq, [0, 1]) == 0          # any wrong pick scores nothing
    assert _grade(msq, []) == 0


def test_doubt_listener_reads_the_kind_of_question():
    assert doubt_agents.listener("Why does ice float?") == "why"
    assert doubt_agents.listener("What is photosynthesis?") == "meaning"
    assert doubt_agents.listener("Solve 2x + 3 = 7") == "numerical"
    assert doubt_agents.listener("give an example of inertia") == "example"


def test_offline_tutor_gets_simpler_on_every_try():
    ctx = {"concept": "Inertia", "key_points": ["Objects resist change in motion.", "More mass, more inertia."],
           "script": "Inertia is the tendency of an object to resist a change in its state of motion. A heavier cart is harder to push.",
           "example": "A bus braking throws you forward."}
    one = doubt_agents._offline_tutor("what is inertia", "meaning", 1, ctx, "en")
    two = doubt_agents._offline_tutor("what is inertia", "meaning", 2, ctx, "en")
    three = doubt_agents._offline_tutor("what is inertia", "meaning", 3, ctx, "en")
    assert "short answer" in one["answer"] and "step by step" in two["answer"] and "simplest" in three["answer"]
    assert "1." in two["answer"] and "bus braking" in two["answer"]
    assert one["check"] and one["engine"] == "lesson-notes"
    bare = doubt_agents._offline_tutor("what is x", "meaning", 3, {"subject": "Science", "chapter": "Motion", "topic": "Speed"}, "en")
    assert "Science → Motion → Speed" in bare["answer"] and "kirana" not in bare["answer"]


def test_focus_score_explains_itself():
    s = SimpleNamespace(last_login_at=utcnow() - timedelta(days=20))
    fresh = [SimpleNamespace(created_at=utcnow()) for _ in range(4)]
    out = _focus(s, overall=5, test_avg=30, open_doubts=2, doubts=fresh, shown={"Science": {"avg_score": 40}})
    assert out["focus_level"] == "high" and out["focus_score"] <= 100
    assert any("Test average" in r for r in out["focus_reasons"]) and any("Inactive" in r for r in out["focus_reasons"])
    calm = _focus(SimpleNamespace(last_login_at=utcnow()), overall=60, test_avg=90, open_doubts=0, doubts=[], shown={})
    assert calm == {"focus_score": 0, "focus_level": "low", "focus_reasons": []}
