"""Dashboard, learner profile, and progress analytics — all computed from SQLite."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from modules.backend.src.db.base import get_db
from modules.backend.src.db.models import User
from modules.backend.src.deps import get_current_user
from modules.backend.src.services import lesson_service, skill_map

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    return lesson_service.dashboard_summary(db, user)


@router.get("/analytics")
def analytics(user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    return lesson_service.analytics(db, user)


@router.get("/profile/learning")
def learner_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    """The rolling mastery profile that drives adaptive planning."""
    profile = lesson_service.refresh_learner_profile(db, user.id)
    return {
        "learner_id": user.id,
        "strong_concepts": profile.strong_concepts,
        "weak_concepts": profile.weak_concepts,
        "current_learning_path": profile.current_learning_path,
        "misconception_counts": profile.misconception_counts,
        "preferred_language": user.preferred_language,
        "preferred_level": user.preferred_level,
        "lessons_started": profile.lessons_started,
        "lessons_completed": profile.lessons_completed,
        "streak_days": profile.streak_days,
        "longest_streak": profile.longest_streak,
        "total_learning_minutes": round(profile.total_learning_sec / 60.0, 1),
    }


@router.get("/journey")
def learner_journey(user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    """Day-by-day activity, streaks, level, mastery and badges for the learner."""
    from modules.backend.src.services import journey_service

    return journey_service.journey(db, user)


class NewConcept(BaseModel):
    topic: str = Field(min_length=2, max_length=80)


@router.get("/skill-map")
def get_skill_map(goal: str | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    """AI concept graph with this learner's mastery, plus a route to `goal`
    (defaults to the learner's saved goal)."""
    return skill_map.snapshot(db, user.id, goal or user.skill_goal_id)


class GoalBody(BaseModel):
    goal: str | None = Field(default=None, max_length=80)


@router.patch("/skill-map/goal")
def set_skill_goal(body: GoalBody, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    """Save (or clear, with null) the learner's goal."""
    if body.goal is not None and not skill_map.valid_goal(body.goal, skill_map.concepts()):
        raise HTTPException(status_code=422, detail="Unknown goal.")
    user.skill_goal_id = body.goal
    db.commit()
    return skill_map.snapshot(db, user.id, body.goal)


@router.post("/skill-map/concepts")
def add_skill_concept(body: NewConcept, user: User = Depends(get_current_user)):
    """Place a new AI topic on the shared map (LLM-assisted)."""
    try:
        return skill_map.add_concept(body.topic)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


class PlacementBody(BaseModel):
    answers: list[dict] = Field(default_factory=list, max_length=12)


@router.post("/skill-map/placement/next")
def placement_next(body: PlacementBody, user: User = Depends(get_current_user)):
    """Grade the answers so far and return the next question (or that it's done)."""
    from modules.backend.src.services import placement
    try:
        return placement.step(body.answers)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.post("/skill-map/placement")
def placement_save(body: PlacementBody, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    """Finish the check: save what's known and the suggested starting difficulty."""
    from modules.backend.src.services import placement
    try:
        user.placement_json = placement.result(body.answers, skill_map.concepts())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    db.commit()
    return {"placement": user.placement_json, "map": skill_map.snapshot(db, user.id, user.skill_goal_id)}


@router.delete("/skill-map/placement")
def placement_reset(user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    user.placement_json = None
    db.commit()
    return skill_map.snapshot(db, user.id, user.skill_goal_id)


# ── spaced review ────────────────────────────────────────────────────────
class ReviewAnswer(BaseModel):
    question_id: str = Field(max_length=40)
    answer: str = Field(max_length=4000)


@router.get("/spaced-review")
def review_due(user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    """Mastered concepts that are due for a refresh, most overdue first."""
    from modules.backend.src.services import review_service
    return {"due": review_service.due(db, user)}


@router.post("/spaced-review/{concept_id}/start")
def review_start(concept_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db, scope="function")):
    from modules.backend.src.services import review_service
    try:
        return review_service.start(db, user, concept_id)
    except review_service.ReviewError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.post("/spaced-review/{concept_id}/answer")
def review_answer(concept_id: str, body: ReviewAnswer, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db, scope="function")):
    from modules.backend.src.services import review_service
    try:
        return review_service.answer(db, user, concept_id, body.question_id, body.answer)
    except review_service.ReviewError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
