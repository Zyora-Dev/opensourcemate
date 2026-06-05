"""
Stage 6 — Automated Contribution Flow.

Given a finished Analysis with code_suggestions, drives the full
fork -> branch -> commit -> push -> open PR sequence via the GitHub REST API
using the signed-in user's stored OAuth token (scope `repo`).

Endpoints:
    POST /analyze/{id}/contribute    Start (or rerun) the flow synchronously.
    GET  /analyze/{id}/contribute    Return the most recent ContributionRun.

The POST blocks until the flow finishes (typically 5-30 seconds). It persists
a ContributionRun row with a JSON `steps` trace so the frontend can render a
real stepper, including partial-success and skipped-file diagnostics.
"""
import base64
import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
import models, schemas

router = APIRouter(prefix="/analyze", tags=["Contribute"])
log = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"
REPO_URL_RE = re.compile(
    r"github\.com[:/]([^/\s]+)/([^/\s]+?)(?:\.git)?(?:/|$)", re.I
)


# ---------------- helpers ----------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _gh_headers(token: str) -> Dict[str, str]:
    return {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "OpenSourceMate",
        "Authorization": f"Bearer {token}",
    }


def _parse_repo(url: Optional[str]) -> Tuple[str, str]:
    """Return (owner, repo) parsed from a github URL, or raise 400."""
    if not url:
        raise HTTPException(400, "Analysis has no repo URL to contribute to")
    m = REPO_URL_RE.search(url)
    if not m:
        raise HTTPException(400, f"Could not parse owner/repo from {url}")
    return m.group(1), m.group(2)


def _slug(s: str, maxlen: int = 40) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", (s or "").lower()).strip("-")
    return (s[:maxlen] or "fix").strip("-")


def _safe_step(steps: List[dict], step: str, status: str, detail: str = "") -> None:
    steps.append({"step": step, "status": status, "detail": detail, "at": _now_iso()})


async def _gh(
    client: httpx.AsyncClient,
    method: str,
    path: str,
    token: str,
    *,
    json_body: Optional[dict] = None,
    allow_404: bool = False,
) -> httpx.Response:
    """Thin GitHub call wrapper. Raises HTTPException on auth issues, returns response otherwise."""
    url = path if path.startswith("http") else f"{GITHUB_API}{path}"
    r = await client.request(method, url, headers=_gh_headers(token), json=json_body, timeout=30.0)
    if r.status_code == 401:
        raise HTTPException(401, "GitHub token rejected — reconnect GitHub")
    if r.status_code == 403:
        msg = r.json().get("message", "forbidden") if r.headers.get("content-type", "").startswith("application/json") else "forbidden"
        raise HTTPException(403, f"GitHub: {msg}")
    if r.status_code == 404 and allow_404:
        return r
    return r


# ---------------- step primitives ----------------

async def _ensure_fork(
    client: httpx.AsyncClient,
    token: str,
    owner: str,
    repo: str,
    me: str,
) -> Tuple[str, str]:
    """
    Return (login, repo_name) of the repo to commit to.

    If the user owns the repo, returns (owner, repo) unchanged.
    Otherwise forks the repo to the user's account (idempotent — if a fork
    already exists, GitHub returns it) and waits briefly for it to be cloneable.
    """
    if me.lower() == owner.lower():
        return owner, repo

    # POST /forks is idempotent — returns existing fork if present.
    r = await _gh(client, "POST", f"/repos/{owner}/{repo}/forks", token)
    if r.status_code not in (200, 202):
        raise HTTPException(r.status_code, f"Fork failed: {r.text[:200]}")
    fork = r.json()
    fork_login = fork["owner"]["login"]
    fork_repo = fork["name"]

    # Poll briefly until the fork's default branch is queryable (avoid race on fresh forks).
    for _ in range(6):
        check = await _gh(client, "GET", f"/repos/{fork_login}/{fork_repo}", token, allow_404=True)
        if check.status_code == 200 and check.json().get("default_branch"):
            return fork_login, fork_repo
        import asyncio
        await asyncio.sleep(1.0)
    # Still return — branch creation will surface the real error if not ready.
    return fork_login, fork_repo


async def _sync_fork_with_upstream(
    client: httpx.AsyncClient,
    token: str,
    fork_login: str,
    fork_repo: str,
    upstream_default: str,
) -> None:
    """Best-effort: bring the fork's default branch up to date with upstream. Never raises."""
    try:
        await _gh(
            client, "POST",
            f"/repos/{fork_login}/{fork_repo}/merge-upstream",
            token,
            json_body={"branch": upstream_default},
            allow_404=True,
        )
    except Exception as e:  # noqa: BLE001
        log.info("merge-upstream skipped: %s", e)


async def _get_default_branch(client: httpx.AsyncClient, token: str, login: str, repo: str) -> Tuple[str, str]:
    """Return (default_branch_name, head_sha)."""
    r = await _gh(client, "GET", f"/repos/{login}/{repo}", token)
    if r.status_code != 200:
        raise HTTPException(r.status_code, f"Could not read repo {login}/{repo}: {r.text[:200]}")
    default = r.json().get("default_branch") or "main"

    ref = await _gh(client, "GET", f"/repos/{login}/{repo}/git/ref/heads/{default}", token, allow_404=True)
    if ref.status_code != 200:
        raise HTTPException(500, f"Could not read default branch ref: {ref.text[:200]}")
    return default, ref.json()["object"]["sha"]


async def _ensure_branch(
    client: httpx.AsyncClient,
    token: str,
    login: str,
    repo: str,
    branch: str,
    from_sha: str,
) -> str:
    """Create branch from from_sha. If branch exists, reuse it."""
    existing = await _gh(client, "GET", f"/repos/{login}/{repo}/git/ref/heads/{branch}", token, allow_404=True)
    if existing.status_code == 200:
        return existing.json()["object"]["sha"]

    r = await _gh(
        client, "POST",
        f"/repos/{login}/{repo}/git/refs",
        token,
        json_body={"ref": f"refs/heads/{branch}", "sha": from_sha},
    )
    if r.status_code not in (200, 201):
        raise HTTPException(r.status_code, f"Branch create failed: {r.text[:200]}")
    return r.json()["object"]["sha"]


async def _apply_suggestion(
    client: httpx.AsyncClient,
    token: str,
    login: str,
    repo: str,
    branch: str,
    sug: dict,
) -> Tuple[bool, str]:
    """
    Apply a single code_suggestion to a file on `branch`.

    Returns (applied, detail). Skips (False) when the `before` snippet can't be
    located uniquely — we never blindly overwrite a file unless it's a new file.
    """
    file_path = (sug.get("file") or "").strip().lstrip("/")
    if not file_path:
        return False, "missing file path"

    before = sug.get("before") or ""
    after = sug.get("after") or ""

    # Fetch the current file contents on the branch (may 404 = new file).
    r = await _gh(
        client, "GET",
        f"/repos/{login}/{repo}/contents/{file_path}",
        token,
        json_body=None,
        allow_404=True,
    )
    # contents API doesn't accept body; ref via query param:
    r = await _gh(client, "GET", f"/repos/{login}/{repo}/contents/{file_path}?ref={branch}", token, allow_404=True)

    existing_sha: Optional[str] = None
    new_text: str
    commit_msg: str

    explanation = (sug.get("explanation") or "").strip().splitlines()[0] if sug.get("explanation") else ""
    short_expl = explanation[:60] + ("…" if len(explanation) > 60 else "")

    if r.status_code == 404:
        # New file — `after` is the entire content. `before` should be empty.
        if not after.strip():
            return False, "file does not exist and no `after` content"
        new_text = after
        commit_msg = f"OSM: create {file_path}" + (f" — {short_expl}" if short_expl else "")
    elif r.status_code == 200:
        meta = r.json()
        if isinstance(meta, list):
            return False, f"{file_path} is a directory"
        existing_sha = meta["sha"]
        try:
            current = base64.b64decode(meta["content"]).decode("utf-8")
        except Exception:
            return False, "file is binary or non-utf8 — cannot patch automatically"

        if not before.strip():
            # No anchor — refuse to clobber an existing file blindly.
            return False, "no `before` snippet to anchor the patch in existing file"

        occurrences = current.count(before)
        if occurrences == 0:
            return False, "`before` snippet not found in current file (may have drifted)"
        if occurrences > 1:
            return False, f"`before` snippet matched {occurrences} times — ambiguous, skipped"
        new_text = current.replace(before, after, 1)
        if new_text == current:
            return False, "patch produced no change"
        commit_msg = f"OSM: update {file_path}" + (f" — {short_expl}" if short_expl else "")
    else:
        return False, f"GET contents failed ({r.status_code})"

    put_body: Dict[str, Any] = {
        "message": commit_msg,
        "content": base64.b64encode(new_text.encode("utf-8")).decode("ascii"),
        "branch": branch,
    }
    if existing_sha:
        put_body["sha"] = existing_sha

    put = await _gh(client, "PUT", f"/repos/{login}/{repo}/contents/{file_path}", token, json_body=put_body)
    if put.status_code not in (200, 201):
        return False, f"PUT failed ({put.status_code}): {put.text[:160]}"
    return True, f"committed {file_path}"


async def _open_pr(
    client: httpx.AsyncClient,
    token: str,
    upstream_owner: str,
    upstream_repo: str,
    head: str,
    base: str,
    title: str,
    body: str,
) -> Tuple[str, int]:
    """Open (or return existing) PR. Returns (html_url, number)."""
    r = await _gh(
        client, "POST",
        f"/repos/{upstream_owner}/{upstream_repo}/pulls",
        token,
        json_body={
            "title": title[:255] or "OpenSourceMate contribution",
            "head": head,
            "base": base,
            "body": body or "_Drafted by OpenSourceMate._",
            "maintainer_can_modify": True,
        },
    )
    if r.status_code == 201:
        d = r.json()
        return d["html_url"], d["number"]

    # 422 = either no diff, or PR already exists. Try to find an existing one.
    if r.status_code == 422:
        head_login = head.split(":", 1)[0]
        listr = await _gh(
            client, "GET",
            f"/repos/{upstream_owner}/{upstream_repo}/pulls?state=open&head={head_login}:{head.split(':',1)[1]}",
            token,
        )
        if listr.status_code == 200:
            arr = listr.json()
            if arr:
                return arr[0]["html_url"], arr[0]["number"]
        # Probably "no commits between base and head" — surface the GitHub message.
        msg = "no changes between branches"
        try:
            errs = r.json().get("errors") or []
            if errs:
                msg = errs[0].get("message", msg)
        except Exception:
            pass
        raise HTTPException(422, f"PR not opened: {msg}")

    raise HTTPException(r.status_code, f"PR open failed: {r.text[:200]}")


# ---------------- main flow ----------------

@router.post("/{analysis_id}/contribute", response_model=schemas.ContributionRunResponse)
async def run_contribution_flow(
    analysis_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    analysis = db.query(models.Analysis).filter(
        models.Analysis.id == analysis_id,
        models.Analysis.user_id == user.id,
    ).first()
    if not analysis:
        raise HTTPException(404, "Analysis not found")
    if not user.github_access_token:
        raise HTTPException(400, "Connect your GitHub account first (Profile → GitHub)")
    if not analysis.repo_url and not analysis.issue_url:
        raise HTTPException(400, "Analysis has no repository to contribute to")

    # Determine upstream owner/repo (prefer repo_url; fall back to parsing issue_url).
    upstream_owner, upstream_repo = _parse_repo(analysis.repo_url or analysis.issue_url)

    # Parse suggestions
    try:
        suggestions = json.loads(analysis.code_suggestions or "[]")
        if not isinstance(suggestions, list):
            suggestions = []
    except Exception:
        suggestions = []
    if not suggestions:
        raise HTTPException(400, "No code suggestions on this analysis — nothing to commit")

    # Create the run row up front so the GET endpoint can show "running" if polled.
    run = models.ContributionRun(
        analysis_id=analysis.id,
        user_id=user.id,
        status="running",
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    steps: List[dict] = []
    token = user.github_access_token

    try:
        async with httpx.AsyncClient() as client:
            # Identify the signed-in user (the fork target).
            me_r = await _gh(client, "GET", "/user", token)
            if me_r.status_code != 200:
                raise HTTPException(me_r.status_code, "Could not read GitHub user")
            me_login = me_r.json()["login"]

            # 1) Fork (or skip if user owns repo)
            _safe_step(steps, "fork", "running", f"{upstream_owner}/{upstream_repo}")
            fork_login, fork_repo = await _ensure_fork(client, token, upstream_owner, upstream_repo, me_login)
            run.fork_repo = f"{fork_login}/{fork_repo}"
            if fork_login == upstream_owner:
                steps[-1].update(status="skipped", detail="you own this repo — committing directly")
            else:
                steps[-1].update(status="success", detail=f"forked to {run.fork_repo}")

            # 2) Default branch + sync fork
            default_branch, upstream_head_sha = await _get_default_branch(client, token, upstream_owner, upstream_repo)
            if fork_login != upstream_owner:
                await _sync_fork_with_upstream(client, token, fork_login, fork_repo, default_branch)
            _, base_sha = await _get_default_branch(client, token, fork_login, fork_repo)

            # 3) Create branch
            branch_name = f"osm/fix-{analysis.id}-{_slug(analysis.issue_title or analysis.repo_name or 'patch')}"
            _safe_step(steps, "branch", "running", branch_name)
            await _ensure_branch(client, token, fork_login, fork_repo, branch_name, base_sha)
            run.branch_name = branch_name
            steps[-1].update(status="success", detail=f"branch ready on {fork_login}/{fork_repo}")

            # 4) Apply each suggestion (= make changes + commit + push, all in one PUT per file)
            _safe_step(steps, "changes", "running", f"{len(suggestions)} suggestion(s)")
            applied = 0
            skipped = 0
            file_log: List[str] = []
            for sug in suggestions:
                ok, detail = await _apply_suggestion(client, token, fork_login, fork_repo, branch_name, sug)
                file_path = (sug.get("file") or "?").strip().lstrip("/")
                if ok:
                    applied += 1
                    file_log.append(f"✓ {file_path}")
                else:
                    skipped += 1
                    file_log.append(f"✗ {file_path} — {detail}")
            run.files_changed = applied
            run.files_skipped = skipped
            steps[-1].update(
                status="success" if applied else "failed",
                detail="\n".join(file_log) or "no files processed",
            )
            # commit & push step is implicit in the PUT — record it for the UI stepper.
            _safe_step(
                steps, "commit",
                "success" if applied else "skipped",
                f"{applied} file(s) committed & pushed to {fork_login}/{fork_repo}@{branch_name}"
                if applied else "no successful patches — nothing to commit",
            )

            if applied == 0:
                run.status = "failed"
                run.error = "No code suggestions could be applied cleanly. Check the file log."
                run.completed_at = datetime.now(timezone.utc)
                run.steps = json.dumps(steps)
                db.commit()
                db.refresh(run)
                return run

            # 5) Open PR on upstream
            _safe_step(steps, "pr", "running", f"{upstream_owner}/{upstream_repo}")
            head = branch_name if fork_login == upstream_owner else f"{fork_login}:{branch_name}"
            pr_title = (analysis.pr_title or analysis.issue_title or f"OpenSourceMate: fix #{analysis.id}").strip()

            pr_body_parts = [analysis.pr_description or ""]
            if analysis.issue_url:
                pr_body_parts.append(f"\nCloses {analysis.issue_url}")
            pr_body_parts.append(
                "\n\n---\n_Drafted with [OpenSourceMate](https://opensourcemate.in) — "
                f"{applied} file(s) changed, {skipped} skipped._"
            )
            pr_body = "\n".join(p for p in pr_body_parts if p is not None).strip()

            pr_url, pr_number = await _open_pr(
                client, token, upstream_owner, upstream_repo, head, default_branch, pr_title, pr_body,
            )
            run.pr_url = pr_url
            run.pr_number = pr_number
            steps[-1].update(status="success", detail=f"PR #{pr_number} opened")

            run.status = "success" if skipped == 0 else "partial"
            run.completed_at = datetime.now(timezone.utc)
            run.steps = json.dumps(steps)
            db.commit()
            db.refresh(run)
            return run

    except HTTPException as e:
        # Record the failure on the run row before re-raising.
        if steps and steps[-1].get("status") == "running":
            steps[-1].update(status="failed", detail=str(e.detail))
        run.status = "failed"
        run.error = str(e.detail)
        run.steps = json.dumps(steps)
        run.completed_at = datetime.now(timezone.utc)
        db.commit()
        raise
    except Exception as e:  # noqa: BLE001
        log.exception("Contribution flow crashed")
        if steps and steps[-1].get("status") == "running":
            steps[-1].update(status="failed", detail=str(e))
        run.status = "failed"
        run.error = f"Unexpected: {e}"
        run.steps = json.dumps(steps)
        run.completed_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(500, f"Contribution flow failed: {e}")


@router.get("/{analysis_id}/contribute", response_model=Optional[schemas.ContributionRunResponse])
async def get_latest_contribution(
    analysis_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    analysis = db.query(models.Analysis).filter(
        models.Analysis.id == analysis_id,
        models.Analysis.user_id == user.id,
    ).first()
    if not analysis:
        raise HTTPException(404, "Analysis not found")

    run = (
        db.query(models.ContributionRun)
        .filter(models.ContributionRun.analysis_id == analysis.id)
        .order_by(models.ContributionRun.id.desc())
        .first()
    )
    return run
