"""Practice Lab: targeted questions that never touch learning state."""

from modules.backend.src.db.models import Lesson, LessonNodeRow


def _lesson_with_history(client, auth_headers, db):
    r = client.post("/api/v1/lessons", headers=auth_headers, json={"topic": "Gradient descent"})
    lesson = db.get(Lesson, r.json()["lesson_id"])
    lesson.difficulty = 3
    script = "Gradient descent updates each weight by a small step against the gradient. The learning rate sets the step size."
    for i, (concept, mastery) in enumerate([("Learning rate", 0.2), ("Gradients", 0.9), ("Untouched", 0.0)]):
        db.add(LessonNodeRow(lesson_id=lesson.id, node_id=f"n{i}", position=i, concept=concept,
                             attempts=0 if concept == "Untouched" else 2, mastery_score=mastery, script_text=script))
    db.commit()
    return lesson


def test_generate_targets_weakest_and_grades_without_touching_mastery(client, auth_headers, db):
    lesson = _lesson_with_history(client, auth_headers, db)
    r = client.post(f"/api/v1/lessons/{lesson.id}/practice/generate", headers=auth_headers)
    assert r.status_code == 200, r.text
    gen = [q for q in r.json()["questions"] if q.get("generated")]
    assert [q["concept"] for q in gen] == ["Learning rate", "Gradients"]          # weakest first, ungraded skipped
    assert [q["difficulty"] for q in gen] == [2, 4]                                # easier where weak, stretch where strong

    q = gen[0]
    answer = q["options"][0] if q["options"] else "a smaller step size"
    r = client.post(f"/api/v1/lessons/{lesson.id}/practice/{q['interaction_id']}", headers=auth_headers, json={"answer": answer})
    assert r.status_code == 200 and "correct" in r.json()

    db.expire_all()
    node = db.query(LessonNodeRow).filter_by(lesson_id=lesson.id, node_id="n0").one()
    assert node.mastery_score == 0.2 and node.attempts == 2                      # learning state untouched


def test_generate_needs_answered_questions(client, auth_headers, db):
    r = client.post("/api/v1/lessons", headers=auth_headers, json={"topic": "Fresh"})
    r = client.post(f"/api/v1/lessons/{r.json()['lesson_id']}/practice/generate", headers=auth_headers)
    assert r.status_code == 409
