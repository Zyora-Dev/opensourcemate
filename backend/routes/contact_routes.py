"""Contact-us route — public, unauthenticated.

POST /contact/  →  send notification to the OSM team inbox
                   + acknowledgement to the submitter.

We rate-limit by IP in a tiny in-memory window to keep abuse low. For higher
volume, swap this for Redis later.
"""
from __future__ import annotations

import logging
import re
import time
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from email_service import send_contact_emails

router = APIRouter(prefix="/contact", tags=["contact"])
log = logging.getLogger("contact")

# Per-IP: keep timestamps of recent submissions.
_RATE_WINDOW_SECONDS = 60 * 10  # 10 min
_RATE_MAX = 5
_recent: Dict[str, Deque[float]] = defaultdict(deque)


class ContactPayload(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    subject: str = Field(default="", max_length=160)
    message: str = Field(min_length=10, max_length=4000)
    # Honeypot — bots tend to fill every field. Real users won't see this.
    website: str | None = Field(default=None, max_length=200)


_URL_RE = re.compile(r"https?://", re.IGNORECASE)


def _hit_rate_limit(ip: str) -> bool:
    now = time.time()
    q = _recent[ip]
    while q and now - q[0] > _RATE_WINDOW_SECONDS:
        q.popleft()
    if len(q) >= _RATE_MAX:
        return True
    q.append(now)
    return False


@router.post("/")
async def submit_contact(
    payload: ContactPayload,
    request: Request,
    background: BackgroundTasks,
):
    # Honeypot — silently accept and drop.
    if (payload.website or "").strip():
        log.info("contact: honeypot triggered, dropping")
        return {"ok": True}

    client_ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or (request.client.host if request.client else "unknown")
    )
    if _hit_rate_limit(client_ip):
        raise HTTPException(429, "Too many submissions. Please try again later.")

    name = payload.name.strip()
    subject = (payload.subject or "").strip() or "(no subject)"
    message = payload.message.strip()

    # Soft spam check: more than 3 URLs in a short message is almost always spam.
    if len(message) < 600 and len(_URL_RE.findall(message)) > 3:
        log.info("contact: link-spam heuristic dropped submission from %s", client_ip)
        return {"ok": True}

    background.add_task(
        send_contact_emails,
        name=name,
        email=str(payload.email),
        subject_in=subject,
        message=message,
    )
    log.info("contact: queued submission from %s <%s>", name, payload.email)
    return {"ok": True}
