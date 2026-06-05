"""Arena — gamified contribution leaderboard.

Pure logic for awarding points, computing levels & streaks, and aggregating
leaderboards. Routes live in routes/arena_routes.py.

All `award_*` helpers are idempotent: each (user_id, event_type, ref_id)
combination is awarded at most once. Daily_login uses a date-bucketed ref_id
(YYYYMMDD as int) to enforce one-per-UTC-day.

Point values are intentionally small and easy to reason about. Tune freely.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, asdict
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

import models

log = logging.getLogger("arena")

# ─── Point values ────────────────────────────────────────────────────────────
POINTS = {
    "daily_login":     5,
    "analysis_done":  10,
    "pr_opened":      50,
    "pr_merged":     200,
}

EVENT_LABELS = {
    "daily_login":   "Daily login",
    "analysis_done": "Analyzed an issue",
    "pr_opened":     "Opened a pull request",
    "pr_merged":     "Pull request merged",
}

# ─── Levels (cumulative thresholds) ──────────────────────────────────────────
# Each level is (name, points_required_to_reach, accent_color).
LEVELS = [
    ("Rookie",    0,    "#94a3b8"),
    ("Bronze",    100,  "#b8722f"),
    ("Silver",    500,  "#9aa3ad"),
    ("Gold",      1500, "#d9a91f"),
    ("Platinum",  4000, "#9bd0d6"),
    ("Diamond",   10000,"#7dd3fc"),
    ("Legend",    25000,"#d97757"),
]


@dataclass
class LevelInfo:
    name: str
    color: str
    current_points: int           # points the user has now
    level_floor: int              # points required to be at this level
    next_name: Optional[str]      # name of the next tier, or None if maxed
    next_floor: Optional[int]     # points required for next tier
    progress_pct: float           # 0..100 within the current band


def level_for(points: int) -> LevelInfo:
    points = max(0, int(points or 0))
    cur_idx = 0
    for i, (_n, threshold, _c) in enumerate(LEVELS):
        if points >= threshold:
            cur_idx = i
    name, floor, color = LEVELS[cur_idx]
    if cur_idx + 1 < len(LEVELS):
        next_name, next_floor, _ = LEVELS[cur_idx + 1]
        span = max(1, next_floor - floor)
        progress = max(0.0, min(100.0, (points - floor) / span * 100.0))
    else:
        next_name = None
        next_floor = None
        progress = 100.0
    return LevelInfo(
        name=name, color=color,
        current_points=points, level_floor=floor,
        next_name=next_name, next_floor=next_floor,
        progress_pct=round(progress, 1),
    )


# ─── Award helpers (idempotent) ──────────────────────────────────────────────

def _award(
    db: Session,
    *,
    user_id: int,
    event_type: str,
    ref_id: Optional[int],
    note: Optional[str] = None,
) -> bool:
    """Insert an arena_events row if the (user, type, ref) tuple isn't already recorded.
    Returns True if a new row was inserted, False if it was a duplicate.

    Exceptions are swallowed and logged — point tracking must never break a request.
    """
    try:
        pts = POINTS.get(event_type)
        if pts is None:
            log.warning("[arena] unknown event_type=%s — refusing to award", event_type)
            return False

        q = db.query(models.ArenaEvent).filter(
            models.ArenaEvent.user_id == user_id,
            models.ArenaEvent.event_type == event_type,
        )
        if ref_id is not None:
            q = q.filter(models.ArenaEvent.ref_id == ref_id)
        if q.first():
            return False

        row = models.ArenaEvent(
            user_id=user_id,
            event_type=event_type,
            points=pts,
            ref_id=ref_id,
            note=note,
        )
        db.add(row)
        db.commit()
        return True
    except Exception as e:  # noqa: BLE001
        log.warning("[arena] award failed (user=%s, type=%s): %s", user_id, event_type, e)
        try:
            db.rollback()
        except Exception:
            pass
        return False


def award_daily_login(db: Session, user_id: int) -> bool:
    today = datetime.now(timezone.utc).date()
    bucket = int(today.strftime("%Y%m%d"))
    return _award(db, user_id=user_id, event_type="daily_login", ref_id=bucket,
                  note=f"login {today.isoformat()}")


def award_analysis_done(db: Session, user_id: int, analysis_id: int) -> bool:
    return _award(db, user_id=user_id, event_type="analysis_done", ref_id=analysis_id,
                  note=f"analysis #{analysis_id}")


def award_pr_opened(db: Session, user_id: int, run_id: int, pr_number: Optional[int]) -> bool:
    note = f"PR #{pr_number}" if pr_number else f"contribution run #{run_id}"
    return _award(db, user_id=user_id, event_type="pr_opened", ref_id=run_id, note=note)


def award_pr_merged(db: Session, user_id: int, run_id: int, pr_number: Optional[int]) -> bool:
    note = f"PR #{pr_number} merged" if pr_number else f"contribution run #{run_id} merged"
    return _award(db, user_id=user_id, event_type="pr_merged", ref_id=run_id, note=note)


# ─── Aggregations ────────────────────────────────────────────────────────────

def total_points(db: Session, user_id: int) -> int:
    return int(
        db.query(func.coalesce(func.sum(models.ArenaEvent.points), 0))
        .filter(models.ArenaEvent.user_id == user_id)
        .scalar()
        or 0
    )


def points_in_window(db: Session, user_id: int, days: int) -> int:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    return int(
        db.query(func.coalesce(func.sum(models.ArenaEvent.points), 0))
        .filter(
            models.ArenaEvent.user_id == user_id,
            models.ArenaEvent.created_at >= since,
        )
        .scalar()
        or 0
    )


def event_breakdown(db: Session, user_id: int) -> dict:
    rows = (
        db.query(
            models.ArenaEvent.event_type,
            func.count(models.ArenaEvent.id),
            func.coalesce(func.sum(models.ArenaEvent.points), 0),
        )
        .filter(models.ArenaEvent.user_id == user_id)
        .group_by(models.ArenaEvent.event_type)
        .all()
    )
    return {
        et: {
            "count": int(cnt),
            "points": int(pts),
            "label": EVENT_LABELS.get(et, et),
        }
        for et, cnt, pts in rows
    }


def streak_days(db: Session, user_id: int) -> int:
    """Consecutive UTC days (ending today or yesterday) the user earned ANY points."""
    rows = (
        db.query(func.date(models.ArenaEvent.created_at))
        .filter(models.ArenaEvent.user_id == user_id)
        .group_by(func.date(models.ArenaEvent.created_at))
        .all()
    )
    if not rows:
        return 0
    days = set()
    for (d,) in rows:
        if isinstance(d, datetime):
            days.add(d.date())
        elif isinstance(d, date):
            days.add(d)
        else:
            try:
                days.add(date.fromisoformat(str(d)))
            except Exception:
                pass
    today = datetime.now(timezone.utc).date()
    # Streak counts back from today; if today missing but yesterday present, start at yesterday.
    start = today if today in days else (today - timedelta(days=1))
    if start not in days:
        return 0
    streak = 0
    cur = start
    while cur in days:
        streak += 1
        cur -= timedelta(days=1)
    return streak


def my_recent_events(db: Session, user_id: int, limit: int = 20) -> List[dict]:
    rows = (
        db.query(models.ArenaEvent)
        .filter(models.ArenaEvent.user_id == user_id)
        .order_by(models.ArenaEvent.id.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "event_type": r.event_type,
            "label": EVENT_LABELS.get(r.event_type, r.event_type),
            "points": r.points,
            "note": r.note,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


def me_summary(db: Session, user_id: int) -> dict:
    pts = total_points(db, user_id)
    return {
        "total_points": pts,
        "weekly_points": points_in_window(db, user_id, 7),
        "monthly_points": points_in_window(db, user_id, 30),
        "streak_days": streak_days(db, user_id),
        "longest_streak": longest_streak(db, user_id),
        "level": asdict(level_for(pts)),
        "breakdown": event_breakdown(db, user_id),
    }


def longest_streak(db: Session, user_id: int) -> int:
    """All-time longest run of consecutive UTC days with any earned points."""
    rows = (
        db.query(func.date(models.ArenaEvent.created_at))
        .filter(models.ArenaEvent.user_id == user_id)
        .group_by(func.date(models.ArenaEvent.created_at))
        .all()
    )
    days: set[date] = set()
    for (d,) in rows:
        if isinstance(d, datetime):
            days.add(d.date())
        elif isinstance(d, date):
            days.add(d)
        else:
            try:
                days.add(date.fromisoformat(str(d)))
            except Exception:
                pass
    if not days:
        return 0
    sorted_days = sorted(days)
    best = run = 1
    for i in range(1, len(sorted_days)):
        if (sorted_days[i] - sorted_days[i - 1]).days == 1:
            run += 1
            best = max(best, run)
        else:
            run = 1
    return best


def daily_activity(db: Session, user_id: int, days: int = 365) -> dict:
    """GitHub-style heatmap data: a list of {date, count, points} for the last N days,
    plus aggregates the UI can show without refetching.
    """
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days - 1)

    since_dt = datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc)
    rows = (
        db.query(
            func.date(models.ArenaEvent.created_at).label("d"),
            func.count(models.ArenaEvent.id).label("count"),
            func.coalesce(func.sum(models.ArenaEvent.points), 0).label("points"),
        )
        .filter(
            models.ArenaEvent.user_id == user_id,
            models.ArenaEvent.created_at >= since_dt,
        )
        .group_by(func.date(models.ArenaEvent.created_at))
        .all()
    )

    by_day: dict[str, dict] = {}
    for d, cnt, pts in rows:
        if isinstance(d, datetime):
            d = d.date()
        elif not isinstance(d, date):
            try:
                d = date.fromisoformat(str(d))
            except Exception:
                continue
        by_day[d.isoformat()] = {"count": int(cnt), "points": int(pts)}

    # Fill in zero-days so the UI gets a uniform window.
    out = []
    cur = start
    total_days_active = 0
    max_in_day = 0
    while cur <= today:
        key = cur.isoformat()
        item = by_day.get(key, {"count": 0, "points": 0})
        if item["count"] > 0:
            total_days_active += 1
            if item["count"] > max_in_day:
                max_in_day = item["count"]
        out.append({"date": key, "count": item["count"], "points": item["points"]})
        cur += timedelta(days=1)

    return {
        "from": start.isoformat(),
        "to": today.isoformat(),
        "days": out,
        "active_days": total_days_active,
        "max_in_day": max_in_day,
    }


def backfill_existing(db: Session) -> dict:
    """One-time seed: award analysis_done for every existing 'done' analysis,
    and pr_opened/pr_merged for every existing contribution_run.
    All awards are idempotent so this is safe to re-run.
    """
    awarded = {"analysis_done": 0, "pr_opened": 0, "pr_merged": 0}
    for a in db.query(models.Analysis).filter(models.Analysis.status == "done").all():
        if award_analysis_done(db, a.user_id, a.id):
            awarded["analysis_done"] += 1
    for r in db.query(models.ContributionRun).filter(
        models.ContributionRun.pr_url.isnot(None)
    ).all():
        if award_pr_opened(db, r.user_id, r.id, r.pr_number):
            awarded["pr_opened"] += 1
        if r.pr_state == "merged":
            if award_pr_merged(db, r.user_id, r.id, r.pr_number):
                awarded["pr_merged"] += 1
    return awarded
