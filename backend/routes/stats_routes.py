"""Public stats — homepage counters. No auth required.

Returns real-time counts for the landing page, with a tiny in-process cache
(60s) so a viral landing page doesn't pound the DB.
"""
from __future__ import annotations

import time
from threading import Lock
from typing import Dict

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
import models

router = APIRouter(prefix="/stats", tags=["Stats"])

_CACHE: Dict[str, object] = {"at": 0.0, "data": None}
_LOCK = Lock()
_TTL_SECONDS = 60.0


def _compute(db: Session) -> dict:
    contributors = int(
        db.query(func.count(models.User.id))
        .filter(models.User.email_verified.is_(True))
        .scalar()
        or 0
    )
    analyses = int(
        db.query(func.count(models.Analysis.id))
        .filter(models.Analysis.status == "done")
        .scalar()
        or 0
    )
    prs_opened = int(
        db.query(func.count(models.ContributionRun.id))
        .filter(models.ContributionRun.pr_url.isnot(None))
        .scalar()
        or 0
    )
    prs_merged = int(
        db.query(func.count(models.ContributionRun.id))
        .filter(models.ContributionRun.pr_state == "merged")
        .scalar()
        or 0
    )
    return {
        "contributors": contributors,
        "analyses": analyses,
        "prs_opened": prs_opened,
        "prs_merged": prs_merged,
    }


@router.get("/public")
def public_stats(db: Session = Depends(get_db)):
    now = time.time()
    with _LOCK:
        cached = _CACHE.get("data")
        cached_at = float(_CACHE.get("at") or 0.0)
        if cached and (now - cached_at) < _TTL_SECONDS:
            return cached
    data = _compute(db)
    with _LOCK:
        _CACHE["data"] = data
        _CACHE["at"] = now
    return data
