"""Spaced review: due dates, pass/fail scheduling, lapses reopen the path."""

from datetime import datetime, timedelta, timezone

import pytest

from modules.backend.src.db.models import Lesson, LessonNodeRow, User
from modules.backend.src.services import skill_map


@pytest.fixture(autouse=True)
def isolated_custom_store(tmp_path, monkeypatch):
    monkeypatch.setattr(skill_map, "_CUSTOM_PATH", tmp_path / "custom.json")


def _mastered(client, auth_headers, db, days_ago=3):
    r = client.post("/api/v1/lessons", headers=auth_headers,
                    json={"topic": "Gradient descent", "skill_concept_id": "gradient_descent", "skill_goal_id": "gradient_descent"})
    lesson = db.get(Lesson, r.json()["lesson_id"])
    db.add(LessonNodeRow(lesson_id=lesson.id, node_id="n0", position=0, concept="Gradient descent", attempts=2,
                         mastery_score=0.9, script_text="Gradient descent steps against the gradient; the learning rate is the step size."))
    lesson.updated_at = datetime.now(timezone.utc) - timedelta(days=days_ago)
    db.commit()
    return lesson


def _answer_all(client, auth_headers, db, right: bool):
    r = client.post("/api/v1/spaced-review/gradient_descent/start", headers=auth_headers)
    assert r.status_code == 200, r.text
    qs = r.json()["questions"]
    assert len(qs) == 2
    user = db.query(User).one()
    db.refresh(user)
    expected = {q["id"]: q["expected_concept"] for q in user.review_json["gradient_descent"]["pending"]}
    out = None
    for q in qs:
        ans = expected[q["id"]] if right else "something unrelated entirely"
        out = client.post("/api/v1/spaced-review/gradient_descent/answer", headers=auth_headers,
                          json={"question_id": q["id"], "answer": ans}).json()
    return out


def test_not_due_until_two_days(client, auth_headers, db):
    _mastered(client, auth_headers, db, days_ago=1)
    assert client.get("/api/v1/spaced-review", headers=auth_headers).json()["due"] == []


def test_pass_pushes_next_review_out(client, auth_headers, db):
    _mastered(client, auth_headers, db)
    due = client.get("/api/v1/spaced-review", headers=auth_headers).json()["due"]
    assert [d["id"] for d in due] == ["gradient_descent"]
    out = _answer_all(client, auth_headers, db, right=True)
    assert out["finished"] and out["passed"] and out["next_in_days"] == 5
    assert client.get("/api/v1/spaced-review", headers=auth_headers).json()["due"] == []


def test_fail_reopens_concept_until_relearned(client, auth_headers, db):
    lesson = _mastered(client, auth_headers, db)
    client.get("/api/v1/spaced-review", headers=auth_headers)
    out = _answer_all(client, auth_headers, db, right=False)
    assert out["finished"] and not out["passed"] and out["next_in_days"] == 2

    states = {c["id"]: (c["mastery"] or {}).get("state") for c in client.get("/api/v1/skill-map", headers=auth_headers).json()["concepts"]}
    assert states["gradient_descent"] == "practice"                    # back on the path
    node = db.query(LessonNodeRow).filter_by(lesson_id=lesson.id).one()
    assert node.mastery_score == 0.9                                    # lesson untouched

    db.refresh(lesson)
    lesson.updated_at = datetime.now(timezone.utc) + timedelta(minutes=1)  # a newer lesson masters it again
    db.commit()
    states = {c["id"]: (c["mastery"] or {}).get("state") for c in client.get("/api/v1/skill-map", headers=auth_headers).json()["concepts"]}
    assert states["gradient_descent"] == "mastered"


def test_cannot_start_a_concept_that_is_not_due(client, auth_headers):
    assert client.post("/api/v1/spaced-review/mamba/start", headers=auth_headers).status_code == 409


def test_placement_concepts_are_reviewed_and_spread_out(client, auth_headers, db):
    from modules.backend.src.services import placement
    answers = []
    while True:
        out = placement.step(answers)
        if out["done"]:
            break
        i = placement._INDEX[out["next"]["id"]]
        answers.append({"id": out["next"]["id"], "choice": placement._shown(i)[1]})
    client.post("/api/v1/skill-map/placement", json={"answers": answers}, headers=auth_headers)
    user = db.query(User).one()
    user.placement_json = {**user.placement_json, "at": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()}
    db.commit()

    due = client.get("/api/v1/spaced-review", headers=auth_headers).json()["due"]
    assert len(due) == 2 and all(d["from_placement"] for d in due)     # staggered: day 2 and day 3 only
    cid = due[0]["id"]
    r = client.post(f"/api/v1/spaced-review/{cid}/start", headers=auth_headers)
    assert r.status_code == 200 and len(r.json()["questions"]) == 2
    db.refresh(user)
    results = [client.post(f"/api/v1/spaced-review/{cid}/answer", headers=auth_headers,
                           json={"question_id": q["id"], "answer": "something unrelated entirely"}).json()
               for q in r.json()["questions"]]
    assert results[-1]["finished"] and not results[-1]["passed"]
    db.expire_all()  # the requests above used their own sessions
    m = skill_map.snapshot(db, user.id, cid)
    states = {c["id"]: (c["mastery"] or {}) for c in m["concepts"]}
    assert states[cid]["state"] == "practice" and states[cid]["lapsed"]
    assert m["route"][-1]["reason"].startswith("Faded")
