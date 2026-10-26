"""The "Why?" log: structured, ordered, owner-only."""

from modules.backend.src.db.models import Lesson
from modules.backend.src.services import lesson_service


def test_why_log_collects_decisions_in_order(client, auth_headers, db):
    r = client.post("/api/v1/lessons", headers=auth_headers, json={"topic": "Gradient descent"})
    lesson = db.get(Lesson, r.json()["lesson_id"])
    lesson_service.log_event(db, lesson, "agent.plan_generated", payload={"node_count": 3, "used_learner_memory": True})
    lesson_service.log_event(db, lesson, "agent.answer_evaluated", "n1", {"correct": False, "misconception_tag": "sign_error"})
    lesson_service.log_event(db, lesson, "agent.adaptation_decided", "n1", {"action": "MODIFY", "attempts_on_node": 1})
    lesson_service.log_event(db, lesson, "agent.adaptation_decided", "n1", {"action": "CONTINUE"})  # not a change: hidden
    lesson.difficulty_state = {"log": [{"from": 2, "to": 3, "reason": "2 right in a row", "at": "2999-01-01T00:00:00+00:00"}]}
    db.commit()

    r = client.get(f"/api/v1/lessons/{lesson.id}/why", headers=auth_headers)
    assert r.status_code == 200
    entries = r.json()["entries"]
    kinds = [e["kind"] for e in entries]
    assert kinds == ["plan", "adapt_modify", "level"]
    assert entries[1]["params"]["misconception"] == "sign_error"
    assert entries[2]["params"] == {"frm": 2, "to": 3, "reason": "streak"}


def test_why_log_is_owner_only(client, auth_headers):
    assert client.get("/api/v1/lessons/does-not-exist/why", headers=auth_headers).status_code == 404
