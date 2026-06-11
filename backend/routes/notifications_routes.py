"""Notifications routes — in-app notification center."""
from typing import Optional
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
import models
import notifications as notif_svc
from auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _serialize(n: models.Notification) -> dict:
    meta = None
    if n.meta:
        try:
            meta = json.loads(n.meta)
        except Exception:
            meta = None
    return {
        "id": n.id,
        "category": n.category,
        "severity": n.severity,
        "title": n.title,
        "body": n.body,
        "ref_kind": n.ref_kind,
        "ref_id": n.ref_id,
        "href": n.href,
        "meta": meta,
        "read_at": n.read_at.isoformat() if n.read_at else None,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


@router.get("")
def list_notifications(
    limit: int = 30,
    only_unread: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    limit = max(1, min(limit, 100))
    rows = notif_svc.list_for_user(db, user_id=current_user.id, limit=limit, only_unread=only_unread)
    return {
        "items": [_serialize(r) for r in rows],
        "unread": notif_svc.unread_count(db, user_id=current_user.id),
    }


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return {"unread": notif_svc.unread_count(db, user_id=current_user.id)}


@router.post("/{nid}/read")
def mark_one_read(
    nid: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ok = notif_svc.mark_read(db, user_id=current_user.id, notification_id=nid)
    if not ok:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"ok": True}


@router.post("/mark-all-read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    n = notif_svc.mark_all_read(db, user_id=current_user.id)
    return {"ok": True, "updated": n}


@router.delete("/{nid}")
def delete_one(
    nid: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ok = notif_svc.delete_one(db, user_id=current_user.id, notification_id=nid)
    if not ok:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"ok": True}


@router.post("/clear-read")
def clear_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    n = notif_svc.delete_all_read(db, user_id=current_user.id)
    return {"ok": True, "deleted": n}
