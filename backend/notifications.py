"""Notifications service.

Single entry point: `notify()`. All award/PR/automation hooks call this.
Failures are swallowed and logged — a notification must NEVER break the
request that triggered it.
"""
from __future__ import annotations

import json
import logging
from typing import Optional, Any, Dict

from sqlalchemy.orm import Session
from sqlalchemy import desc, func

import models

log = logging.getLogger(__name__)

CATEGORY_POINTS = "points"
CATEGORY_PR = "pr"
CATEGORY_AUTOMATION = "automation"
CATEGORY_ANALYSIS = "analysis"
CATEGORY_GITHUB = "github"
CATEGORY_SYSTEM = "system"

VALID_CATEGORIES = {
    CATEGORY_POINTS, CATEGORY_PR, CATEGORY_AUTOMATION,
    CATEGORY_ANALYSIS, CATEGORY_GITHUB, CATEGORY_SYSTEM,
}
VALID_SEVERITIES = {"info", "success", "warning", "error"}


def notify(
    db: Session,
    *,
    user_id: int,
    category: str,
    title: str,
    body: Optional[str] = None,
    severity: str = "info",
    ref_kind: Optional[str] = None,
    ref_id: Optional[int] = None,
    href: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None,
    dedupe: bool = False,
) -> Optional[int]:
    """Insert a Notification row. Returns the new id or None on failure.

    If `dedupe=True` and a row already exists for (user_id, category, ref_kind, ref_id),
    no new row is inserted. Use this for award notifications keyed off arena event ids.
    """
    try:
        if category not in VALID_CATEGORIES:
            log.warning("[notify] unknown category=%s", category)
            category = CATEGORY_SYSTEM
        if severity not in VALID_SEVERITIES:
            severity = "info"

        if dedupe and ref_id is not None and ref_kind is not None:
            existing = (
                db.query(models.Notification)
                .filter(
                    models.Notification.user_id == user_id,
                    models.Notification.category == category,
                    models.Notification.ref_kind == ref_kind,
                    models.Notification.ref_id == ref_id,
                )
                .first()
            )
            if existing:
                return existing.id

        row = models.Notification(
            user_id=user_id,
            category=category,
            severity=severity,
            title=title[:255],
            body=body,
            ref_kind=ref_kind,
            ref_id=ref_id,
            href=href,
            meta=json.dumps(meta) if meta else None,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row.id
    except Exception as e:  # noqa: BLE001
        log.warning("[notify] failed (user=%s, category=%s, title=%s): %s", user_id, category, title, e)
        try:
            db.rollback()
        except Exception:
            pass
        return None


def list_for_user(
    db: Session,
    *,
    user_id: int,
    limit: int = 30,
    only_unread: bool = False,
):
    q = db.query(models.Notification).filter(models.Notification.user_id == user_id)
    if only_unread:
        q = q.filter(models.Notification.read_at.is_(None))
    return q.order_by(desc(models.Notification.created_at)).limit(limit).all()


def unread_count(db: Session, *, user_id: int) -> int:
    return int(
        db.query(func.count(models.Notification.id))
        .filter(
            models.Notification.user_id == user_id,
            models.Notification.read_at.is_(None),
        )
        .scalar()
        or 0
    )


def mark_read(db: Session, *, user_id: int, notification_id: int) -> bool:
    row = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == notification_id,
            models.Notification.user_id == user_id,
        )
        .first()
    )
    if not row:
        return False
    if row.read_at is None:
        row.read_at = func.now()
        db.commit()
    return True


def mark_all_read(db: Session, *, user_id: int) -> int:
    n = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == user_id,
            models.Notification.read_at.is_(None),
        )
        .update({models.Notification.read_at: func.now()}, synchronize_session=False)
    )
    db.commit()
    return int(n or 0)


def delete_one(db: Session, *, user_id: int, notification_id: int) -> bool:
    row = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == notification_id,
            models.Notification.user_id == user_id,
        )
        .first()
    )
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True


def delete_all_read(db: Session, *, user_id: int) -> int:
    n = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == user_id,
            models.Notification.read_at.isnot(None),
        )
        .delete(synchronize_session=False)
    )
    db.commit()
    return int(n or 0)
