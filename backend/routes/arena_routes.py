"""Arena routes — personal activity & points (no leaderboard)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
import models
import arena
from auth import get_current_user

router = APIRouter(prefix="/arena", tags=["Arena"])


@router.get("/me")
def me(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Hero stats: total points, weekly/monthly windows, streak, level breakdown."""
    # Award daily login on first visit of the day. Idempotent.
    arena.award_daily_login(db, current_user.id)
    return arena.me_summary(db, current_user.id)


@router.get("/activity")
def activity(
    days: int = 365,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """GitHub-style heatmap data — one bucket per UTC day for the last N days."""
    days = max(30, min(days, 730))
    return arena.daily_activity(db, current_user.id, days=days)


@router.get("/feed")
def feed(
    limit: int = 25,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Recent point-earning events for the signed-in user."""
    limit = max(1, min(limit, 100))
    return {"events": arena.my_recent_events(db, current_user.id, limit=limit)}
