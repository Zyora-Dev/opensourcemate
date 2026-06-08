"""ZeptoMail email service for OpenSourceMate.

Handles transactional emails: OTP verification, password reset, welcome.
All sends are non-blocking from the caller's perspective — exceptions are
caught and logged so a mail failure can never 500 an auth flow.
"""
from __future__ import annotations

import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger("email_service")

ZEPTO_HOST = os.getenv("ZEPTO_HOST", "api.zeptomail.in")
ZEPTO_TOKEN = os.getenv("ZEPTO_TOKEN", "")  # full "Zoho-enczapikey ..." string
ZEPTO_FROM_ADDRESS = os.getenv("ZEPTO_FROM_ADDRESS", "welcome@opensourcemate.in")
ZEPTO_FROM_NAME = os.getenv("ZEPTO_FROM_NAME", "OpensourceMate")
APP_BASE_URL = os.getenv("APP_BASE_URL", "https://opensourcemate.in")

_BRAND_PRIMARY = "#d97757"  # crimson — matches frontend
_BRAND_DARK_BG = "#0b0b0c"
_BRAND_PANEL = "#141416"
_BRAND_BORDER = "#2a2a2e"
_BRAND_MUTED = "#9b9ba0"
_BRAND_TEXT = "#f4f4f5"


def _is_configured() -> bool:
    return bool(ZEPTO_TOKEN and ZEPTO_FROM_ADDRESS)


def _shell(title: str, preheader: str, inner_html: str) -> str:
    """Wrap content in a consistent dark-themed branded shell."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background:{_BRAND_DARK_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:{_BRAND_TEXT};">
<span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">{preheader}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:{_BRAND_DARK_BG};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background:{_BRAND_PANEL};border:1px solid {_BRAND_BORDER};border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:28px 32px 0 32px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="vertical-align:middle;">
                  <span style="display:inline-block;width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,{_BRAND_PRIMARY},#b85a3e);text-align:center;line-height:34px;font-weight:700;color:#fff;font-size:16px;">M</span>
                </td>
                <td style="vertical-align:middle;padding-left:10px;font-weight:600;font-size:15px;letter-spacing:0.2px;color:{_BRAND_TEXT};">
                  OpenSourceMate
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 32px 32px;">
            {inner_html}
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <hr style="border:none;border-top:1px solid {_BRAND_BORDER};margin:0 0 16px 0;" />
            <p style="margin:0;color:{_BRAND_MUTED};font-size:12px;line-height:1.6;">
              You're receiving this email because you have an account on OpenSourceMate.<br/>
              Need help? Reply to this email — we read every message.
            </p>
            <p style="margin:10px 0 0 0;color:{_BRAND_MUTED};font-size:11px;">
              © OpenSourceMate · <a href="{APP_BASE_URL}" style="color:{_BRAND_MUTED};text-decoration:underline;">opensourcemate.in</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>"""


def render_otp_email(otp: str, purpose: str = "verify your email") -> tuple[str, str]:
    subject = f"Your OpenSourceMate code: {otp}"
    inner = f"""
      <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:600;letter-spacing:-0.2px;color:{_BRAND_TEXT};">Confirm it's you</h1>
      <p style="margin:0 0 20px 0;color:{_BRAND_MUTED};font-size:14px;line-height:1.6;">
        Use the code below to {purpose}. This code is valid for the next 10 minutes.
      </p>
      <div style="background:{_BRAND_DARK_BG};border:1px solid {_BRAND_BORDER};border-radius:12px;padding:22px;text-align:center;margin:0 0 22px 0;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:{_BRAND_MUTED};margin-bottom:8px;">Your verification code</div>
        <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:{_BRAND_PRIMARY};">{otp}</div>
      </div>
      <p style="margin:0;color:{_BRAND_MUTED};font-size:13px;line-height:1.6;">
        If you didn't request this code, you can safely ignore this email — someone may have typed your address by mistake.
      </p>
    """
    html = _shell(subject, f"Your verification code is {otp}", inner)
    return subject, html


def render_welcome_email(name: str) -> tuple[str, str]:
    safe_name = (name or "there").strip().split()[0] if name else "there"
    subject = "Welcome to OpenSourceMate 🎉"
    inner = f"""
      <h1 style="margin:0 0 10px 0;font-size:24px;font-weight:600;letter-spacing:-0.3px;color:{_BRAND_TEXT};">
        Welcome, {safe_name}.
      </h1>
      <p style="margin:0 0 22px 0;color:{_BRAND_MUTED};font-size:15px;line-height:1.65;">
        You're in. OpenSourceMate is your AI guide for contributing to real open source projects —
        from understanding the issue, to writing the fix, to opening a polished pull request.
      </p>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 22px 0;">
        <tr>
          <td style="background:{_BRAND_DARK_BG};border:1px solid {_BRAND_BORDER};border-radius:12px;padding:18px 18px 14px 18px;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:{_BRAND_MUTED};margin-bottom:8px;">What you can do today</div>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr><td style="padding:6px 0;color:{_BRAND_TEXT};font-size:14px;line-height:1.5;">
                <span style="color:{_BRAND_PRIMARY};font-weight:700;">→</span>&nbsp; Paste any GitHub issue, error log, or merge conflict
              </td></tr>
              <tr><td style="padding:6px 0;color:{_BRAND_TEXT};font-size:14px;line-height:1.5;">
                <span style="color:{_BRAND_PRIMARY};font-weight:700;">→</span>&nbsp; Get a step-by-step solution with code suggestions
              </td></tr>
              <tr><td style="padding:6px 0;color:{_BRAND_TEXT};font-size:14px;line-height:1.5;">
                <span style="color:{_BRAND_PRIMARY};font-weight:700;">→</span>&nbsp; Auto-fork, branch, commit, and open a real pull request
              </td></tr>
              <tr><td style="padding:6px 0;color:{_BRAND_TEXT};font-size:14px;line-height:1.5;">
                <span style="color:{_BRAND_PRIMARY};font-weight:700;">→</span>&nbsp; Track your skills, badges, and merged PRs as you grow
              </td></tr>
            </table>
          </td>
        </tr>
      </table>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="border-radius:10px;background:{_BRAND_PRIMARY};">
            <a href="{APP_BASE_URL}/dashboard" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.2px;">
              Open your dashboard →
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:22px 0 0 0;color:{_BRAND_MUTED};font-size:13px;line-height:1.65;">
        Tip: connect your GitHub from the dashboard so we can open pull requests on your behalf.
        Your first contribution is just a few clicks away.
      </p>
    """
    html = _shell(subject, "Welcome to OpenSourceMate — let's ship your first contribution.", inner)
    return subject, html


def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    to_name: Optional[str] = None,
) -> bool:
    """Send a single email via ZeptoMail. Returns True on success."""
    if not _is_configured():
        logger.warning("[email_service] ZEPTO_TOKEN not configured; skipping send to %s", to_email)
        return False

    url = f"https://{ZEPTO_HOST}/v1.1/email"
    headers = {
        "Authorization": ZEPTO_TOKEN,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = {
        "from": {"address": ZEPTO_FROM_ADDRESS, "name": ZEPTO_FROM_NAME},
        "to": [{"email_address": {"address": to_email, "name": to_name or to_email}}],
        "subject": subject,
        "htmlbody": html_body,
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code >= 400:
                logger.error(
                    "[email_service] ZeptoMail %s -> %s: %s",
                    resp.status_code, to_email, resp.text[:500],
                )
                return False
            logger.info("[email_service] sent '%s' to %s", subject, to_email)
            return True
    except Exception as e:
        logger.exception("[email_service] send failed to %s: %s", to_email, e)
        return False


def send_otp_email(to_email: str, otp: str, purpose: str = "verify your email") -> bool:
    subject, html = render_otp_email(otp, purpose=purpose)
    return send_email(to_email, subject, html)


def send_welcome_email(to_email: str, name: Optional[str]) -> bool:
    subject, html = render_welcome_email(name or "")
    return send_email(to_email, subject, html, to_name=name)


# ──────────────────────────────────────────────────────────────────────────────
# Contact-us forms
# ──────────────────────────────────────────────────────────────────────────────

CONTACT_INBOX = os.getenv("CONTACT_INBOX", "ramya.cm@opensourcemate.in")
CONTACT_INBOX_NAME = os.getenv("CONTACT_INBOX_NAME", "OpenSourceMate Team")


def _esc(s: str) -> str:
    """Tiny HTML-escape for user-supplied fields."""
    return (
        (s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def render_contact_notification_email(
    name: str, email: str, subject_in: str, message: str
) -> tuple[str, str]:
    """Internal notification — sent to the OSM team inbox."""
    subject = f"New contact form: {subject_in or '(no subject)'}"
    msg_html = _esc(message).replace("\n", "<br/>")
    inner = f"""
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:{_BRAND_PRIMARY};margin-bottom:8px;">New contact submission</div>
      <h1 style="margin:0 0 18px 0;font-size:22px;font-weight:600;letter-spacing:-0.2px;color:{_BRAND_TEXT};">
        {_esc(subject_in) or 'No subject'}
      </h1>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
             style="background:{_BRAND_DARK_BG};border:1px solid {_BRAND_BORDER};border-radius:12px;padding:18px;margin:0 0 18px 0;">
        <tr>
          <td style="padding:6px 0;color:{_BRAND_MUTED};font-size:12px;width:100px;">From</td>
          <td style="padding:6px 0;color:{_BRAND_TEXT};font-size:14px;">{_esc(name) or '—'}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:{_BRAND_MUTED};font-size:12px;">Email</td>
          <td style="padding:6px 0;color:{_BRAND_TEXT};font-size:14px;">
            <a href="mailto:{_esc(email)}" style="color:{_BRAND_PRIMARY};text-decoration:none;">{_esc(email)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:{_BRAND_MUTED};font-size:12px;vertical-align:top;">Subject</td>
          <td style="padding:6px 0;color:{_BRAND_TEXT};font-size:14px;">{_esc(subject_in) or '—'}</td>
        </tr>
      </table>

      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:{_BRAND_MUTED};margin-bottom:8px;">Message</div>
      <div style="background:{_BRAND_DARK_BG};border:1px solid {_BRAND_BORDER};border-radius:12px;padding:18px;color:{_BRAND_TEXT};font-size:14px;line-height:1.65;white-space:pre-wrap;">
        {msg_html}
      </div>

      <p style="margin:18px 0 0 0;color:{_BRAND_MUTED};font-size:12px;line-height:1.6;">
        Reply directly to this email to reach <span style="color:{_BRAND_TEXT};">{_esc(name) or _esc(email)}</span>.
      </p>
    """
    html = _shell(subject, f"New contact from {name or email}", inner)
    return subject, html


def render_contact_acknowledgement_email(name: str, message: str) -> tuple[str, str]:
    """Auto-reply sent to the person who submitted the form."""
    safe_name = (name or "there").strip().split()[0] if name else "there"
    subject = "We received your message — OpenSourceMate"
    msg_html = _esc(message).replace("\n", "<br/>")
    inner = f"""
      <h1 style="margin:0 0 10px 0;font-size:22px;font-weight:600;letter-spacing:-0.2px;color:{_BRAND_TEXT};">
        Thanks, {_esc(safe_name)}.
      </h1>
      <p style="margin:0 0 20px 0;color:{_BRAND_MUTED};font-size:14px;line-height:1.65;">
        Your message just landed in our inbox. A real human from the OpenSourceMate team
        will get back to you within one business day.
      </p>

      <div style="background:{_BRAND_DARK_BG};border:1px solid {_BRAND_BORDER};border-radius:12px;padding:18px;margin:0 0 22px 0;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:{_BRAND_MUTED};margin-bottom:8px;">Your message</div>
        <div style="color:{_BRAND_TEXT};font-size:14px;line-height:1.65;white-space:pre-wrap;">{msg_html}</div>
      </div>

      <p style="margin:0 0 4px 0;color:{_BRAND_MUTED};font-size:13px;line-height:1.65;">
        In the meantime, you can keep exploring:
      </p>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="border-radius:10px;background:{_BRAND_PRIMARY};">
            <a href="{APP_BASE_URL}" style="display:inline-block;padding:11px 20px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.2px;">
              Visit OpenSourceMate →
            </a>
          </td>
        </tr>
      </table>
    """
    html = _shell(subject, "Thanks for reaching out — we'll be in touch soon.", inner)
    return subject, html


def send_contact_emails(name: str, email: str, subject_in: str, message: str) -> dict:
    """Fire both emails: internal notification + user acknowledgement.

    Returns a dict with per-recipient outcomes; never raises.
    """
    out = {"notification": False, "acknowledgement": False}
    try:
        sub_n, html_n = render_contact_notification_email(name, email, subject_in, message)
        out["notification"] = send_email(
            CONTACT_INBOX, sub_n, html_n, to_name=CONTACT_INBOX_NAME,
        )
    except Exception as e:
        logger.exception("[email_service] contact notification failed: %s", e)
    try:
        sub_a, html_a = render_contact_acknowledgement_email(name, message)
        out["acknowledgement"] = send_email(email, sub_a, html_a, to_name=name)
    except Exception as e:
        logger.exception("[email_service] contact ack failed: %s", e)
    return out
