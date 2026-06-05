"""
Stage 7 — Learning & Tracking.

Aggregates a single learning summary for the signed-in user from existing
tables (analyses, contribution_runs). No new tables required for Phase A —
badges are derived deterministically on each call.

Endpoint:
    GET /learning/   →  LearningSummaryResponse
"""
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
import models

router = APIRouter(prefix="/learning", tags=["Learning"])


# ---------- helpers ----------

def _streak_from_dates(dates: List[date]) -> tuple[int, int]:
    """Return (current_streak, longest_streak) from an UNSORTED list of activity dates."""
    if not dates:
        return 0, 0
    uniq = sorted(set(dates))

    longest = 1
    run = 1
    for i in range(1, len(uniq)):
        if (uniq[i] - uniq[i - 1]).days == 1:
            run += 1
            longest = max(longest, run)
        else:
            run = 1

    today = datetime.now(timezone.utc).date()
    current = 0
    if uniq[-1] in (today, today - timedelta(days=1)):
        current = 1
        for i in range(len(uniq) - 1, 0, -1):
            if (uniq[i] - uniq[i - 1]).days == 1:
                current += 1
            else:
                break
    return current, longest


def _badge(
    key: str,
    name: str,
    description: str,
    unlocked: bool,
    unlocked_at: Optional[datetime] = None,
    current: Optional[int] = None,
    target: Optional[int] = None,
    icon: str = "FiAward",
    tone: str = "crimson",
) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "key": key,
        "name": name,
        "description": description,
        "unlocked": unlocked,
        "icon": icon,
        "tone": tone,
    }
    if unlocked_at:
        out["unlocked_at"] = unlocked_at.isoformat()
    if current is not None and target is not None:
        out["progress"] = {"current": min(current, target), "target": target}
    return out


# ---------- main endpoint ----------

@router.get("/")
def get_learning_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> Dict[str, Any]:
    user_id = current_user.id

    # All this user's analyses (single fetch — bounded per user, fine for in-mem aggregation).
    analyses = (
        db.query(models.Analysis)
        .filter(models.Analysis.user_id == user_id)
        .order_by(models.Analysis.created_at.desc())
        .all()
    )
    runs = (
        db.query(models.ContributionRun)
        .filter(models.ContributionRun.user_id == user_id)
        .all()
    )

    now = datetime.now(timezone.utc)

    # ---- totals ----
    pr_opened = sum(1 for r in runs if r.status in ("success", "partial") and r.pr_url)
    pr_merged = sum(1 for r in runs if getattr(r, "pr_state", None) == "merged")  # phase C will set this

    activity_dates = [a.created_at.date() for a in analyses if a.created_at]
    streak, longest_streak = _streak_from_dates(activity_dates)

    languages = sorted({(a.repo_language or "").strip() for a in analyses if a.repo_language})
    languages = [l for l in languages if l]

    totals = {
        "analyses": len(analyses),
        "pr_attempts": len(runs),
        "pr_opened": pr_opened,
        "pr_merged": pr_merged,
        "languages": len(languages),
        "days_active": len(set(activity_dates)),
        "streak": streak,
        "longest_streak": longest_streak,
    }

    # ---- skills (per-language usage) ----
    skill_counter: Counter = Counter()
    last_used: Dict[str, datetime] = {}
    for a in analyses:
        lang = (a.repo_language or "").strip()
        if not lang:
            continue
        skill_counter[lang] += 1
        if a.created_at and (lang not in last_used or a.created_at > last_used[lang]):
            last_used[lang] = a.created_at
    skills = [
        {
            "name": lang,
            "count": cnt,
            "last_used": last_used[lang].isoformat() if lang in last_used else None,
        }
        for lang, cnt in skill_counter.most_common()
    ]

    # ---- difficulty mix ----
    diff_mix = {"easy": 0, "medium": 0, "hard": 0}
    for a in analyses:
        d = (a.difficulty or "").strip().lower()
        if d in diff_mix:
            diff_mix[d] += 1

    # ---- weekly activity (last 12 weeks, ISO Monday-anchored) ----
    today = now.date()
    monday_today = today - timedelta(days=today.weekday())
    weekly: Dict[date, Dict[str, int]] = {
        monday_today - timedelta(weeks=i): {"analyses": 0, "prs_opened": 0}
        for i in range(11, -1, -1)
    }
    for a in analyses:
        if not a.created_at:
            continue
        d = a.created_at.date()
        m = d - timedelta(days=d.weekday())
        if m in weekly:
            weekly[m]["analyses"] += 1
    for r in runs:
        if not r.pr_url or r.status not in ("success", "partial"):
            continue
        if not r.created_at:
            continue
        d = r.created_at.date()
        m = d - timedelta(days=d.weekday())
        if m in weekly:
            weekly[m]["prs_opened"] += 1
    weekly_list = [
        {"week": m.isoformat(), "analyses": v["analyses"], "prs_opened": v["prs_opened"]}
        for m, v in sorted(weekly.items())
    ]

    # ---- recent activity (last 8) ----
    pr_by_analysis: Dict[int, models.ContributionRun] = {}
    for r in sorted(runs, key=lambda x: x.id):
        if r.pr_url:
            pr_by_analysis[r.analysis_id] = r
    recent = []
    for a in analyses[:8]:
        run = pr_by_analysis.get(a.id)
        recent.append({
            "id": a.id,
            "issue_title": a.issue_title,
            "repo_name": a.repo_name,
            "repo_language": a.repo_language,
            "difficulty": a.difficulty,
            "status": a.status,
            "has_pr": bool(run and run.pr_url),
            "pr_url": run.pr_url if run else None,
            "pr_number": run.pr_number if run else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    # ---- badges (deterministic from above counts) ----
    first_analysis_at = analyses[-1].created_at if analyses else None
    first_pr_run = next(
        (r for r in sorted(runs, key=lambda x: x.id) if r.pr_url and r.status in ("success", "partial")),
        None,
    )
    hard_done = any((a.difficulty or "").lower() == "hard" and a.status == "done" for a in analyses)
    hard_first = next(
        (a for a in sorted(analyses, key=lambda x: x.id) if (a.difficulty or "").lower() == "hard" and a.status == "done"),
        None,
    )

    badges = [
        _badge(
            "first_analysis", "First analysis",
            "Run your first AI-powered issue analysis.",
            unlocked=len(analyses) >= 1,
            unlocked_at=first_analysis_at,
            current=min(len(analyses), 1), target=1,
            icon="FiZap", tone="crimson",
        ),
        _badge(
            "first_pr", "First pull request",
            "Open your first PR through the contribution flow.",
            unlocked=first_pr_run is not None,
            unlocked_at=first_pr_run.created_at if first_pr_run else None,
            current=min(pr_opened, 1), target=1,
            icon="FiGitPullRequest", tone="emerald",
        ),
        _badge(
            "polyglot", "Polyglot",
            "Analyze repositories across 3 different languages.",
            unlocked=len(languages) >= 3,
            current=len(languages), target=3,
            icon="FiGlobe", tone="violet",
        ),
        _badge(
            "bug_hunter", "Bug hunter",
            "Complete 10 analyses.",
            unlocked=len(analyses) >= 10,
            current=len(analyses), target=10,
            icon="FiSearch", tone="amber",
        ),
        _badge(
            "streak_3", "On a roll",
            "Stay active 3 days in a row.",
            unlocked=longest_streak >= 3,
            current=longest_streak, target=3,
            icon="FiTrendingUp", tone="sky",
        ),
        _badge(
            "streak_7", "Weekly habit",
            "Hit a 7-day streak.",
            unlocked=longest_streak >= 7,
            current=longest_streak, target=7,
            icon="FiCalendar", tone="fuchsia",
        ),
        _badge(
            "brave", "Brave",
            "Successfully analyze a hard issue.",
            unlocked=hard_done,
            unlocked_at=hard_first.created_at if hard_first else None,
            current=1 if hard_done else 0, target=1,
            icon="FiShield", tone="red",
        ),
        _badge(
            "maintainers_friend", "Maintainer's friend",
            "Open 5 pull requests.",
            unlocked=pr_opened >= 5,
            current=pr_opened, target=5,
            icon="FiHeart", tone="pink",
        ),
        _badge(
            "shipper", "Shipper",
            "Get a pull request merged. (Tracked once your PR state syncs.)",
            unlocked=pr_merged >= 1,
            current=pr_merged, target=1,
            icon="FiAward", tone="emerald",
        ),
    ]
    badges_unlocked = sum(1 for b in badges if b["unlocked"])

    return {
        "totals": totals,
        "skills": skills,
        "difficulty_mix": diff_mix,
        "weekly": weekly_list,
        "recent_activity": recent,
        "badges": badges,
        "badges_unlocked": badges_unlocked,
        "badges_total": len(badges),
        "generated_at": now.isoformat(),
    }


@router.post("/embeddings/backfill")
async def backfill_embeddings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Re-embed every completed analysis owned by the signed-in user. Useful right
    after RAG is enabled to seed the vector index. Returns count + any failures.
    No-op (200 + skipped=N) if RAG isn't enabled.
    """
    try:
        from rag import is_enabled as _rag_on, embed_and_store
    except Exception as e:  # noqa: BLE001
        return {"enabled": False, "embedded": 0, "skipped": 0, "reason": f"rag import failed: {e}"}

    if not _rag_on():
        return {"enabled": False, "embedded": 0, "skipped": 0, "reason": "RAG not configured"}

    rows = (
        db.query(models.Analysis)
        .filter(
            models.Analysis.user_id == current_user.id,
            models.Analysis.status == "done",
        )
        .all()
    )
    embedded = 0
    skipped = 0
    for a in rows:
        ok = await embed_and_store(db, a, is_private=False, pr_merged=False)
        if ok:
            embedded += 1
        else:
            skipped += 1
    return {"enabled": True, "embedded": embedded, "skipped": skipped, "total": len(rows)}
