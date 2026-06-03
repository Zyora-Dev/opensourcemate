#!/usr/bin/env bash
# OpenSourceMate — Backend installer (macOS / Linux)
# Sets up Postgres DB/user, Python venv, and dependencies in one go.
# Usage (from project root):  bash setup-backend.sh

set -e

GREEN="\033[1;32m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
BLUE="\033[1;34m"
NC="\033[0m"

say()  { echo -e "${BLUE}==>${NC} $1"; }
ok()   { echo -e "${GREEN}\xE2\x9C\x94${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
die()  { echo -e "${RED}\xE2\x9C\x97${NC} $1"; exit 1; }

DB_NAME="opensourcemate"
DB_USER="opensource"

# ---------- 0. Locate backend/ ----------
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
[ -d backend ] || die "backend/ folder not found next to this script."
cd backend
[ -f main.py ] || die "backend/main.py missing — is the project extracted correctly?"

# ---------- 1. Python ----------
say "Checking Python 3.11+"
PY=""
for cand in python3.11 python3.12 python3; do
  if command -v "$cand" >/dev/null 2>&1; then
    VER=$("$cand" -c 'import sys; print("%d.%d" % sys.version_info[:2])')
    MAJOR=${VER%.*}; MINOR=${VER#*.}
    if [ "$MAJOR" -ge 3 ] && [ "$MINOR" -ge 11 ]; then
      PY="$cand"; break
    fi
  fi
done
[ -n "$PY" ] || die "Python 3.11+ not found. Install it first (see README.md)."
ok "Using $($PY --version) at $(command -v $PY)"

# ---------- 2. Postgres ----------
say "Checking PostgreSQL"
command -v psql >/dev/null 2>&1 || die "psql not found. Install PostgreSQL first (see README.md)."
ok "psql found: $(psql --version)"

say "Ensuring database '$DB_NAME' and role '$DB_USER' exist"
# Try without sudo first (works on macOS Homebrew + most local setups)
if createuser "$DB_USER" 2>/dev/null; then
  ok "Created role '$DB_USER'"
else
  warn "Role '$DB_USER' likely already exists (or peer auth needs sudo). Trying sudo path..."
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null | grep -q 1 \
    || sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_USER';" 2>/dev/null \
    || warn "Could not auto-create role. Continuing (assuming it exists)."
fi

if createdb -O "$DB_USER" "$DB_NAME" 2>/dev/null; then
  ok "Created database '$DB_NAME'"
else
  warn "Database '$DB_NAME' likely already exists (or needs sudo). Trying sudo path..."
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null | grep -q 1 \
    || sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null \
    || warn "Could not auto-create db. Continuing (assuming it exists)."
fi

# ---------- 3. venv + deps ----------
if [ -d venv ]; then
  ok "venv/ already exists, reusing it"
else
  say "Creating virtual environment in venv/"
  "$PY" -m venv venv
  ok "venv created"
fi

# shellcheck disable=SC1091
source venv/bin/activate

say "Upgrading pip"
pip install --quiet --upgrade pip

say "Installing requirements"
pip install --quiet -r requirements.txt
ok "Python dependencies installed"

# ---------- 4. Smoke test ----------
say "Verifying app imports"
python -c "import main; print('  main.py imports cleanly')" \
  || die "Backend import failed. Check Postgres connection in database.py."

# ---------- Done ----------
echo
ok "Backend setup complete!"
echo
echo "  Start the backend with:"
echo "    cd backend"
echo "    source venv/bin/activate    # (Windows: venv\\Scripts\\activate)"
echo "    uvicorn main:app --reload"
echo
echo "  Then visit: http://127.0.0.1:8000/docs"
