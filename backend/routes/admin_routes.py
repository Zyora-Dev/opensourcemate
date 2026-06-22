"""Admin panel routes — read-only operator dashboard.

Auth: a separate JWT issued by POST /admin/login with credentials checked
against ADMIN_USERNAME / ADMIN_PASSWORD env vars (defaults to
webadmin / Opensource@123). The token is signed with the same SECRET_KEY
and carries `kind: "admin"` so it can't be confused with a user token.

All endpoints under /admin/* require this admin token.
"""
from __future__ import annotations

import hmac
import json
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from database import get_db
from auth import SECRET_KEY, ALGORITHM
import models

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "webadmin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Opensource@123")
ADMIN_TOKEN_EXPIRE_HOURS = int(os.getenv("ADMIN_TOKEN_EXPIRE_HOURS", "12"))

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Auth ─────────────────────────────────────────────────────────────────────

class AdminLoginBody(BaseModel):
    username: str
    password: str


def _create_admin_token() -> str:
    payload = {
        "sub": "admin",
        "kind": "admin",
        "exp": datetime.utcnow() + timedelta(hours=ADMIN_TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def require_admin(authorization: Optional[str] = Header(None)) -> bool:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin token required")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("kind") != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not an admin token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired admin token")
    return True


@router.post("/login")
def admin_login(body: AdminLoginBody):
    # Constant-time comparison so we don't leak length info via timing
    u_ok = hmac.compare_digest(body.username.encode(), ADMIN_USERNAME.encode())
    p_ok = hmac.compare_digest(body.password.encode(), ADMIN_PASSWORD.encode())
    if not (u_ok and p_ok):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    return {
        "token": _create_admin_token(),
        "expires_in_hours": ADMIN_TOKEN_EXPIRE_HOURS,
    }


# ─── Serializers ──────────────────────────────────────────────────────────────

def _user_summary(u: models.User) -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "name": u.name,
        "mobile": u.mobile,
        "user_type": u.user_type.value if u.user_type else None,
        "email_verified": bool(u.email_verified),
        "onboarding_completed": bool(u.onboarding_completed),
        "github_username": u.github_username,
        "github_avatar_url": u.github_avatar_url,
        "github_connected": bool(u.github_access_token),
        "github_connected_at": u.github_connected_at.isoformat() if u.github_connected_at else None,
        "website": u.website,
        "linkedin": u.linkedin,
        "location": u.location,
        "bio": u.bio,
        "avatar_url": u.avatar_url,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


def _analysis_summary(a: models.Analysis) -> dict:
    return {
        "id": a.id,
        "user_id": a.user_id,
        "issue_url": a.issue_url,
        "repo_url": a.repo_url,
        "repo_name": a.repo_name,
        "repo_language": a.repo_language,
        "issue_title": a.issue_title,
        "difficulty": a.difficulty,
        "status": a.status,
        "model_used": a.model_used,
        "error_message": a.error_message,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _run_summary(r: models.ContributionRun) -> dict:
    return {
        "id": r.id,
        "analysis_id": r.analysis_id,
        "user_id": r.user_id,
        "status": r.status,
        "fork_repo": r.fork_repo,
        "branch_name": r.branch_name,
        "pr_url": r.pr_url,
        "pr_number": r.pr_number,
        "pr_state": r.pr_state,
        "pr_merged_at": r.pr_merged_at.isoformat() if r.pr_merged_at else None,
        "files_changed": r.files_changed,
        "files_skipped": r.files_skipped,
        "error": (r.error[:280] if r.error else None),
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "completed_at": r.completed_at.isoformat() if r.completed_at else None,
    }


# ─── Overview ─────────────────────────────────────────────────────────────────

@router.get("/overview")
def overview(_admin: bool = Depends(require_admin), db: Session = Depends(get_db)):
    total_users = int(db.query(func.count(models.User.id)).scalar() or 0)
    verified_users = int(
        db.query(func.count(models.User.id))
        .filter(models.User.email_verified.is_(True))
        .scalar() or 0
    )
    onboarded_users = int(
        db.query(func.count(models.User.id))
        .filter(models.User.onboarding_completed.is_(True))
        .scalar() or 0
    )
    github_connected = int(
        db.query(func.count(models.User.id))
        .filter(models.User.github_access_token.isnot(None))
        .scalar() or 0
    )
    total_analyses = int(db.query(func.count(models.Analysis.id)).scalar() or 0)
    done_analyses = int(
        db.query(func.count(models.Analysis.id))
        .filter(models.Analysis.status == "done").scalar() or 0
    )
    error_analyses = int(
        db.query(func.count(models.Analysis.id))
        .filter(models.Analysis.status == "error").scalar() or 0
    )

    unique_repos = int(
        db.query(func.count(func.distinct(models.Analysis.repo_name)))
        .filter(models.Analysis.repo_name.isnot(None))
        .scalar() or 0
    )

    total_runs = int(db.query(func.count(models.ContributionRun.id)).scalar() or 0)
    prs_opened = int(
        db.query(func.count(models.ContributionRun.id))
        .filter(models.ContributionRun.pr_url.isnot(None)).scalar() or 0
    )
    prs_merged = int(
        db.query(func.count(models.ContributionRun.id))
        .filter(models.ContributionRun.pr_state == "merged").scalar() or 0
    )
    prs_failed = int(
        db.query(func.count(models.ContributionRun.id))
        .filter(models.ContributionRun.status == "failed").scalar() or 0
    )

    arena_points = int(
        db.query(func.coalesce(func.sum(models.ArenaEvent.points), 0)).scalar() or 0
    )
    total_notifications = int(db.query(func.count(models.Notification.id)).scalar() or 0)

    return {
        "users": {
            "total": total_users,
            "verified": verified_users,
            "onboarded": onboarded_users,
            "github_connected": github_connected,
        },
        "analyses": {
            "total": total_analyses,
            "done": done_analyses,
            "error": error_analyses,
            "unique_repos": unique_repos,
        },
        "contributions": {
            "total_runs": total_runs,
            "prs_opened": prs_opened,
            "prs_merged": prs_merged,
            "failed_runs": prs_failed,
        },
        "engagement": {
            "arena_points_awarded": arena_points,
            "notifications_sent": total_notifications,
        },
    }


# ─── Users ────────────────────────────────────────────────────────────────────

@router.get("/users")
def list_users(
    q: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _admin: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(models.User)
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(
            func.lower(models.User.email).like(like)
            | func.lower(func.coalesce(models.User.name, "")).like(like)
            | func.lower(func.coalesce(models.User.github_username, "")).like(like)
        )
    total = int(query.with_entities(func.count(models.User.id)).scalar() or 0)
    rows = query.order_by(desc(models.User.created_at)).offset(offset).limit(limit).all()
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [_user_summary(u) for u in rows],
    }


@router.get("/users/{user_id}")
def user_detail(
    user_id: int,
    _admin: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found")

    analyses = (
        db.query(models.Analysis)
        .filter(models.Analysis.user_id == user_id)
        .order_by(desc(models.Analysis.created_at))
        .limit(100).all()
    )
    runs = (
        db.query(models.ContributionRun)
        .filter(models.ContributionRun.user_id == user_id)
        .order_by(desc(models.ContributionRun.created_at))
        .limit(50).all()
    )
    points = int(
        db.query(func.coalesce(func.sum(models.ArenaEvent.points), 0))
        .filter(models.ArenaEvent.user_id == user_id).scalar() or 0
    )

    repos = sorted({a.repo_name for a in analyses if a.repo_name})

    return {
        "user": _user_summary(u),
        "analyses": [_analysis_summary(a) for a in analyses],
        "contributions": [_run_summary(r) for r in runs],
        "arena_points": points,
        "repos": repos,
    }


# ─── Analyses ─────────────────────────────────────────────────────────────────

@router.get("/analyses")
def list_analyses(
    q: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _admin: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(models.Analysis)
    if status_filter:
        query = query.filter(models.Analysis.status == status_filter)
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(
            func.lower(func.coalesce(models.Analysis.repo_name, "")).like(like)
            | func.lower(func.coalesce(models.Analysis.issue_title, "")).like(like)
        )
    total = int(query.with_entities(func.count(models.Analysis.id)).scalar() or 0)
    rows = query.order_by(desc(models.Analysis.created_at)).offset(offset).limit(limit).all()
    user_ids = {a.user_id for a in rows}
    users = {
        u.id: {"id": u.id, "email": u.email, "name": u.name, "github_username": u.github_username}
        for u in db.query(models.User).filter(models.User.id.in_(user_ids)).all()
    } if user_ids else {}
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [{**_analysis_summary(a), "user": users.get(a.user_id)} for a in rows],
    }


@router.get("/analyses/{analysis_id}")
def analysis_detail(
    analysis_id: int,
    _admin: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    a = db.query(models.Analysis).filter(models.Analysis.id == analysis_id).first()
    if not a:
        raise HTTPException(404, "Analysis not found")
    user = db.query(models.User).filter(models.User.id == a.user_id).first()
    runs = (
        db.query(models.ContributionRun)
        .filter(models.ContributionRun.analysis_id == a.id)
        .order_by(desc(models.ContributionRun.id)).all()
    )

    # Full body fields included so admin sees results
    suggestions = None
    if a.code_suggestions:
        try:
            suggestions = json.loads(a.code_suggestions)
        except Exception:
            suggestions = None

    full = {
        **_analysis_summary(a),
        "user": _user_summary(user) if user else None,
        "issue_body": a.issue_body,
        "summary": a.summary,
        "files_involved": (a.files_involved or "").split("\n") if a.files_involved else [],
        "tech_stack": [t.strip() for t in (a.tech_stack or "").split(",") if t.strip()],
        "root_cause": a.root_cause,
        "solution_steps": a.solution_steps,
        "git_commands": (a.git_commands or "").split("\n") if a.git_commands else [],
        "pr_title": a.pr_title,
        "pr_description": a.pr_description,
        "code_suggestions": suggestions,
        "error_log": a.error_log,
        "merge_conflict": a.merge_conflict,
        "contributions": [_run_summary(r) for r in runs],
    }
    return full


# ─── Repos (derived from analyses) ────────────────────────────────────────────

@router.get("/repos")
def list_repos(
    _admin: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            models.Analysis.repo_name,
            models.Analysis.repo_language,
            func.count(models.Analysis.id).label("analysis_count"),
            func.count(func.distinct(models.Analysis.user_id)).label("user_count"),
            func.max(models.Analysis.created_at).label("last_analyzed_at"),
        )
        .filter(models.Analysis.repo_name.isnot(None))
        .group_by(models.Analysis.repo_name, models.Analysis.repo_language)
        .order_by(desc(func.count(models.Analysis.id)))
        .limit(200).all()
    )
    pr_counts = dict(
        db.query(
            models.Analysis.repo_name,
            func.count(models.ContributionRun.id),
        )
        .join(models.ContributionRun, models.ContributionRun.analysis_id == models.Analysis.id)
        .filter(models.ContributionRun.pr_url.isnot(None))
        .group_by(models.Analysis.repo_name).all()
    )
    return {
        "items": [
            {
                "repo": r.repo_name,
                "language": r.repo_language,
                "analysis_count": int(r.analysis_count or 0),
                "user_count": int(r.user_count or 0),
                "pr_count": int(pr_counts.get(r.repo_name, 0)),
                "last_analyzed_at": r.last_analyzed_at.isoformat() if r.last_analyzed_at else None,
            }
            for r in rows
        ],
    }


# ─── Contributions / PRs ──────────────────────────────────────────────────────

@router.get("/contributions")
def list_contributions(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _admin: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(models.ContributionRun)
    if status_filter:
        query = query.filter(models.ContributionRun.status == status_filter)
    total = int(query.with_entities(func.count(models.ContributionRun.id)).scalar() or 0)
    rows = (
        query.order_by(desc(models.ContributionRun.created_at))
        .offset(offset).limit(limit).all()
    )
    user_ids = {r.user_id for r in rows}
    analysis_ids = {r.analysis_id for r in rows}
    users = {
        u.id: {"id": u.id, "email": u.email, "github_username": u.github_username}
        for u in db.query(models.User).filter(models.User.id.in_(user_ids)).all()
    } if user_ids else {}
    analyses = {
        a.id: {"id": a.id, "repo_name": a.repo_name, "issue_title": a.issue_title}
        for a in db.query(models.Analysis).filter(models.Analysis.id.in_(analysis_ids)).all()
    } if analysis_ids else {}
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {**_run_summary(r), "user": users.get(r.user_id), "analysis": analyses.get(r.analysis_id)}
            for r in rows
        ],
    }
