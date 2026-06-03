#!/usr/bin/env bash
# OpenSourceMate — Frontend installer (macOS / Linux)
# Installs Node dependencies and writes a sensible .env.local.
# Usage (from project root):  bash setup-frontend.sh

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

API_URL="${NEXT_PUBLIC_API_URL:-http://127.0.0.1:8000}"

# ---------- 0. Locate frontend/ ----------
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
[ -d frontend ] || die "frontend/ folder not found next to this script."
cd frontend
[ -f package.json ] || die "frontend/package.json missing — is the project extracted correctly?"

# ---------- 1. Node + npm ----------
say "Checking Node.js (>= 20)"
command -v node >/dev/null 2>&1 || die "Node.js not found. Install Node 20 LTS first (see README.md)."
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 20 ] || die "Node $NODE_MAJOR detected; please upgrade to Node 20 or newer."
ok "Node $(node --version)"

command -v npm >/dev/null 2>&1 || die "npm not found."
ok "npm $(npm --version)"

# ---------- 2. .env.local ----------
if [ -f .env.local ]; then
  ok ".env.local already exists \xE2\x80\x94 leaving as-is"
else
  say "Writing .env.local with API URL = $API_URL"
  cat > .env.local <<EOF
# Backend API URL used by the frontend.
# Override with: NEXT_PUBLIC_API_URL=http://my-host:8000 bash install.sh
NEXT_PUBLIC_API_URL=$API_URL
EOF
  ok ".env.local created"
fi

# ---------- 3. Install ----------
say "Installing npm dependencies (this may take a minute)"
npm install --no-fund --no-audit
ok "Frontend dependencies installed"

# ---------- 4. Lint (best-effort) ----------
say "Running lint check"
if npm run --silent lint >/dev/null 2>&1; then
  ok "Lint passed"
else
  warn "Lint reported issues (non-fatal). Run 'npm run lint' to see details."
fi

# ---------- Done ----------
echo
ok "Frontend setup complete!"
echo
echo "  Start the dev server with:"
echo "    cd frontend"
echo "    npm run dev"
echo
echo "  Then open: http://localhost:3000"
echo "  (Make sure the backend is running at $API_URL)"
