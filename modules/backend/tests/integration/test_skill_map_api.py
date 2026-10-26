"""Skill map endpoints: graph, goal routes, and adding a concept (offline)."""

import pytest

from modules.backend.src.services import skill_map


@pytest.fixture(autouse=True)
def isolated_custom_store(tmp_path, monkeypatch):
    monkeypatch.setattr(skill_map, "_CUSTOM_PATH", tmp_path / "custom.json")
    monkeypatch.setenv("GEMINI_API_KEY", "")


def test_graph_has_no_dangling_prerequisites():
    graph = skill_map.concepts()
    assert all(p in graph for c in graph.values() for p in c["prereqs"])


def test_snapshot_and_goal_route(client, auth_headers):
    r = client.get("/api/v1/skill-map", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert len(body["concepts"]) >= 60 and body["route"] == []

    r = client.get("/api/v1/skill-map?goal=mamba", headers=auth_headers)
    route = r.json()["route"]
    ids = [s["id"] for s in route]
    assert ids[-1] == "mamba" and ids.index("ssm") < ids.index("mamba")
    assert sum(1 for s in route if s.get("next")) == 1


def test_unknown_goal_is_ignored(client, auth_headers):
    r = client.get("/api/v1/skill-map?goal=not_a_concept", headers=auth_headers)
    assert r.status_code == 200 and r.json()["goal"] is None


def test_add_concept_persists(client, auth_headers):
    r = client.post("/api/v1/skill-map/concepts", json={"topic": "Mamba-2 selective scan"}, headers=auth_headers)
    assert r.status_code == 200
    cid = r.json()["id"]
    ids = {c["id"] for c in client.get("/api/v1/skill-map", headers=auth_headers).json()["concepts"]}
    assert cid in ids


def test_requires_auth(client):
    assert client.get("/api/v1/skill-map").status_code == 401


def test_lesson_tags_and_planner_context(client, auth_headers, db):
    from modules.backend.src.db.models import Lesson
    from modules.backend.src.services.session_manager import SessionManager

    r = client.post("/api/v1/lessons", headers=auth_headers, json={
        "topic": "Self-attention", "skill_concept_id": "self_attention", "skill_goal_id": "mamba"})
    assert r.status_code == 201
    lesson = db.get(Lesson, r.json()["lesson_id"])
    assert (lesson.skill_concept_id, lesson.skill_goal_id) == ("self_attention", "mamba")

    memory = SessionManager.memory_for(lesson, db)  # first lesson: still gets the route
    path = memory["learning_path"]
    assert path["concept"] == "Self-attention & multi-head" and path["goal"] == "Mamba"
    assert "Attention" in path["not_yet_learned"]

    detail = client.get(f"/api/v1/lessons/{lesson.id}", headers=auth_headers).json()
    assert detail["skill_goal_id"] == "mamba"


def test_unknown_skill_ids_are_dropped_not_rejected(client, auth_headers, db):
    from modules.backend.src.db.models import Lesson

    r = client.post("/api/v1/lessons", headers=auth_headers, json={"topic": "x y", "skill_concept_id": "nope", "skill_goal_id": "mamba"})
    assert r.status_code == 201
    lesson = db.get(Lesson, r.json()["lesson_id"])
    assert lesson.skill_concept_id is None and lesson.skill_goal_id is None


def test_failed_concept_gets_a_recap_of_its_weakest_prerequisite():
    graph = skill_map.concepts()
    m = {p: {"state": "mastered", "score": s} for p, s in [("attention", 0.9), ("matrix_mult", 0.55)]}
    m["self_attention"] = {"state": "practice", "score": 0.3}
    steps = skill_map.route("self_attention", graph, m)
    assert [s["id"] for s in steps][:2] == ["matrix_mult", "self_attention"]
    assert steps[0]["state"] == "recap" and steps[0].get("next")


def test_course_goal_covers_everything_in_learnable_order():
    graph = skill_map.concepts()
    ids = [s["id"] for s in skill_map.route(skill_map.COURSE, graph, {})]
    assert set(ids) == set(graph)
    pos = {c: i for i, c in enumerate(ids)}
    assert all(pos[p] < pos[c] for c in graph for p in graph[c]["prereqs"])
    # foundations from several tracks come before any frontier topic
    assert ids.index("what_is_ml") < ids.index("vectors") + 10 and ids.index("mamba") > len(ids) // 2


def test_track_goal_and_saved_goal(client, auth_headers):
    r = client.patch("/api/v1/skill-map/goal", json={"goal": "__track_dl"}, headers=auth_headers)
    assert r.status_code == 200
    body = client.get("/api/v1/skill-map", headers=auth_headers).json()  # no param: saved goal
    assert body["goal"] == "__track_dl" and body["goal_title"].startswith("Deep learning")
    assert {s["id"] for s in body["route"]} >= {"cnn", "lstm", "backprop"}
    assert body["scope_total"] >= len(body["route"]) and body["scope_done"] == 0

    assert client.patch("/api/v1/skill-map/goal", json={"goal": "bogus"}, headers=auth_headers).status_code == 422
    client.patch("/api/v1/skill-map/goal", json={"goal": None}, headers=auth_headers)
    assert client.get("/api/v1/skill-map", headers=auth_headers).json()["goal"] is None


def test_journey_keeps_finished_steps_in_order():
    graph = skill_map.concepts()
    m = {"what_is_ml": {"state": "mastered", "score": 0.9, "lesson_id": "L1", "lesson_status": "completed"},
         "data_features": {"state": "practice", "score": 0.3, "lesson_id": "L2", "lesson_status": "completed"}}
    steps = skill_map.route("linear_regression", graph, m)
    j = skill_map.journey("linear_regression", graph, m, steps)
    ids = [x["id"] for x in j]
    assert ids[0] == "what_is_ml" and j[0]["state"] == "done" and j[0]["lesson_id"] == "L1"
    assert ids[-1] == "linear_regression" and {s["id"] for s in steps} <= set(ids)
    assert len(j) == len(steps) + 1
