#!/usr/bin/env python3
"""Demo helper: make a learner's spaced reviews due right now.

    python scripts/make_reviews_due.py learner@example.com            # every scheduled concept
    python scripts/make_reviews_due.py learner@example.com gradient_descent overfitting

Only moves due dates; nothing about lessons or scores changes.
"""
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from modules.backend.src.db.base import SessionLocal, init_db  # noqa: E402
from modules.backend.src.db.models import User  # noqa: E402
from modules.backend.src.services import review_service  # noqa: E402


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    email, only = sys.argv[1].strip().lower(), set(sys.argv[2:])
    init_db()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).one_or_none()
        if user is None:
            print(f"No user with email {email}")
            return 1
        review_service.due(db, user)  # creates schedules for anything mastered but not yet scheduled
        reviews = dict(user.review_json or {})
        past = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
        moved = [cid for cid in reviews if not only or cid in only]
        for cid in moved:
            reviews[cid] = {**reviews[cid], "due": past}
        user.review_json = reviews
        db.commit()
        print(f"Due now for {email}: {', '.join(moved) or '(nothing mastered yet: finish a lesson or take the placement check)'}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
