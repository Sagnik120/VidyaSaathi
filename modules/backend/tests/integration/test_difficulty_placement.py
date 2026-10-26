"""Live difficulty rules and the placement check."""

from types import SimpleNamespace

import pytest

from modules.backend.src.services import difficulty, placement, skill_map


@pytest.fixture(autouse=True)
def isolated_custom_store(tmp_path, monkeypatch):
    monkeypatch.setattr(skill_map, "_CUSTOM_PATH", tmp_path / "custom.json")


def _lesson(level="beginner", diff=None):
    return SimpleNamespace(level=level, difficulty=diff, difficulty_state=None)


def ev(correct, credit=0.0):
    return {"correct": correct, "partial_credit": credit}


def test_two_right_steps_up_one_wrong_steps_down_partial_holds():
    l = _lesson()                                   # beginner starts at 2
    assert difficulty.update(l, ev(True)) is None and l.difficulty == 2
    change = difficulty.update(l, ev(True))
    assert change["from"] == 2 and change["to"] == 3 and l.difficulty == 3
    assert difficulty.update(l, ev(False, 0.6)) is None and l.difficulty == 3   # partial: hold
    assert difficulty.update(l, ev(True)) is None                               # streak was reset
    assert difficulty.update(l, ev(False, 0.2))["to"] == 2
    assert len(l.difficulty_state["log"]) == 2


def test_level_is_bounded():
    l = _lesson(diff=1)
    assert difficulty.update(l, ev(False)) is None and l.difficulty == 1
    l = _lesson(diff=5)
    difficulty.update(l, ev(True))
    assert difficulty.update(l, ev(True)) is None and l.difficulty == 5


def _answer_all(right: bool):
    answers = []
    while True:
        out = placement.step(answers)
        if out["done"]:
            return answers, out
        q = out["next"]
        i = placement._INDEX[q["id"]]
        key = placement._shown(i)[1]
        answers.append({"id": q["id"], "choice": key if right else (key + 1) % 4})


def test_placement_is_adaptive_and_bounded():
    answers, out = _answer_all(True)
    assert out["known_upto"] == placement.BANK[-1][0] and len(answers) <= placement.MAX_QUESTIONS
    answers, out = _answer_all(False)
    assert out["known_upto"] is None
    keys = {placement._shown(i)[1] for i in range(len(placement.BANK))}
    assert len(keys) > 1                               # the right answer isn't always the same slot


def test_placement_rejects_answers_to_questions_not_asked():
    with pytest.raises(ValueError):
        placement.step([{"id": "transformer", "choice": 0}])


def test_placement_api_marks_known_and_lessons_override(client, auth_headers, db):
    answers, _ = _answer_all(True)
    r = client.post("/api/v1/skill-map/placement", json={"answers": answers}, headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["placement"]["difficulty"] == 4 and "transformer" in body["placement"]["known"]
    states = {c["id"]: (c["mastery"] or {}).get("state") for c in body["map"]["concepts"]}
    assert states["vectors"] == "mastered" and states["mamba"] is None

    # A new lesson starts near the placement level, within one step of the chosen level.
    r = client.post("/api/v1/lessons", json={"topic": "Attention basics", "level": "beginner"}, headers=auth_headers)
    from modules.backend.src.db.models import Lesson
    assert db.get(Lesson, r.json()["lesson_id"]).difficulty == 3

    assert client.delete("/api/v1/skill-map/placement", headers=auth_headers).json()["placement"] is None
