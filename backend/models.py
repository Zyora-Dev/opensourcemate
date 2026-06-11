import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class UserType(str, enum.Enum):
    freelancer = "Freelancer"
    student = "Student"
    enterprise = "Enterprise"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=True)
    email_verified = Column(Boolean, default=False, nullable=False)

    # onboarding fields
    name = Column(String, nullable=True)
    mobile = Column(String, nullable=True)
    user_type = Column(Enum(UserType), nullable=True)
    website = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    onboarding_completed = Column(Boolean, default=False)

    # profile fields
    bio = Column(String, nullable=True)
    location = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)

    # GitHub OAuth fields
    github_id = Column(Integer, unique=True, index=True, nullable=True)
    github_username = Column(String, nullable=True)
    github_avatar_url = Column(String, nullable=True)
    github_access_token = Column(String, nullable=True)
    github_connected_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # what the user pasted
    issue_url = Column(String, nullable=True)
    repo_url = Column(String, nullable=True)
    error_log = Column(Text, nullable=True)
    merge_conflict = Column(Text, nullable=True)

    # captured GitHub context (denormalised JSON-as-text for simplicity)
    issue_title = Column(String, nullable=True)
    issue_body = Column(Text, nullable=True)
    repo_name = Column(String, nullable=True)
    repo_language = Column(String, nullable=True)

    # AI output
    summary = Column(Text, nullable=True)
    difficulty = Column(String, nullable=True)         # easy | medium | hard
    files_involved = Column(Text, nullable=True)       # newline-separated
    tech_stack = Column(Text, nullable=True)           # comma-separated
    root_cause = Column(Text, nullable=True)
    solution_steps = Column(Text, nullable=True)       # markdown
    git_commands = Column(Text, nullable=True)         # newline-separated shell
    pr_title = Column(String, nullable=True)
    pr_description = Column(Text, nullable=True)
    code_suggestions = Column(Text, nullable=True)     # JSON-encoded list of {file, lines, before, after, explanation, language}

    status = Column(String, default="pending")         # pending | done | error
    error_message = Column(String, nullable=True)
    model_used = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class AnalysisMessage(Base):
    """Chat messages tied to an analysis (user ↔ AI assistant)."""
    __tablename__ = "analysis_messages"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String, nullable=False)  # "user" | "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ContributionRun(Base):
    """Tracks one automated contribution attempt (Stage 6 of the OSM flow).

    Each row records: fork → branch → commit → push → open PR. Steps stores a
    JSON list of {step, status, detail, at} entries so the UI can render a
    real stepper instead of guessing.
    """
    __tablename__ = "contribution_runs"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    status = Column(String, default="pending")   # pending | running | success | partial | failed
    fork_repo = Column(String, nullable=True)    # "login/repo" actually used for commits
    branch_name = Column(String, nullable=True)
    pr_url = Column(String, nullable=True)
    pr_number = Column(Integer, nullable=True)
    pr_state = Column(String, nullable=True)     # open | closed | merged (refreshed by poll)
    pr_merged_at = Column(DateTime(timezone=True), nullable=True)
    pr_checked_at = Column(DateTime(timezone=True), nullable=True)
    files_changed = Column(Integer, default=0)
    files_skipped = Column(Integer, default=0)
    steps = Column(Text, nullable=True)          # JSON: [{step,status,detail,at}]
    error = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)


class EmailOTP(Base):
    """One-time codes for email verification & password reset.

    A row is created on demand and consumed (deleted) on successful verify.
    `payload` stores serialized JSON — for register flow this holds the
    bcrypt-hashed password so we don't materialize a half-verified user.
    """
    __tablename__ = "email_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    purpose = Column(String, nullable=False)           # "register" | "forgot_password"
    otp_hash = Column(String, nullable=False)          # bcrypt-hashed 6-digit code
    payload = Column(Text, nullable=True)              # JSON, e.g. {"password_hash": "..."}
    attempts = Column(Integer, default=0, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ArenaEvent(Base):
    """A single point-earning event for the Arena leaderboard.

    Events are immutable facts. Aggregations (totals, weekly, streaks) run on top.
    `event_type` is one of: daily_login | analysis_done | pr_opened | pr_merged.
    `ref_id` is the foreign id (analysis_id or contribution_run id) so we can
    deduplicate awards (e.g. don't double-award if the merge poll runs twice).
    """
    __tablename__ = "arena_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)
    points = Column(Integer, nullable=False, default=0)
    ref_id = Column(Integer, nullable=True)            # analysis_id, contribution_run.id, or null
    note = Column(String, nullable=True)               # short human-readable label
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    user = relationship("User")


class Notification(Base):
    """User-facing in-app notification.

    Categories: points | pr | automation | system | analysis | github
    Severity: info | success | warning | error
    `ref_kind` + `ref_id` let the UI deep-link (e.g. ref_kind="analysis", ref_id=123 → /analyze/123).
    `meta` stores a small JSON blob (e.g. points awarded, PR number) for richer rendering.
    """
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String, nullable=False, index=True)
    severity = Column(String, nullable=False, default="info")
    title = Column(String, nullable=False)
    body = Column(Text, nullable=True)
    ref_kind = Column(String, nullable=True)       # analysis | contribution_run | arena_event | system
    ref_id = Column(Integer, nullable=True)
    href = Column(String, nullable=True)           # optional explicit link override
    meta = Column(Text, nullable=True)             # JSON
    read_at = Column(DateTime(timezone=True), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    user = relationship("User")
