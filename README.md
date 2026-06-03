# OpenSourceMate

> AI-powered open source contributions — find the right issues, understand codebases faster, and ship meaningful PRs.

A full-stack app with a **FastAPI + PostgreSQL** backend and a **Next.js 15 (React 19) + Tailwind v4** frontend.

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Project structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Quick start (TL;DR)](#quick-start-tldr)
5. [Backend setup](#backend-setup)
6. [Frontend setup](#frontend-setup)
7. [Running the app](#running-the-app)
8. [API reference](#api-reference)
9. [Environment variables](#environment-variables)
10. [Common issues / troubleshooting](#common-issues--troubleshooting)
11. [Useful commands cheat sheet](#useful-commands-cheat-sheet)

---

## Tech stack

**Backend**
- Python 3.11+
- FastAPI 0.115
- SQLAlchemy 2.0 (sync)
- PostgreSQL 14+
- JWT auth (`python-jose`) + bcrypt password hashing (`passlib`)

**Frontend**
- Next.js 15 (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- Framer Motion (animations)
- shadcn/ui primitives (button, input, label, card, etc.)
- `react-icons` (Feather + Simple Icons)

---

## Project structure

```
opensource/
├── backend/
│   ├── main.py                # FastAPI app + CORS + router includes
│   ├── auth.py                # JWT, bcrypt, get_current_user dependency
│   ├── database.py            # SQLAlchemy engine + session
│   ├── models.py              # User, Profile ORM models
│   ├── schemas.py             # Pydantic request/response models
│   ├── requirements.txt
│   └── routes/
│       ├── auth_routes.py     # /auth/register, /auth/login
│       ├── onboarding_routes.py # /onboarding/
│       └── dashboard_routes.py  # /dashboard/
└── frontend/
    ├── package.json
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── src/
        ├── app/
        │   ├── page.tsx           # Landing
        │   ├── login/page.tsx
        │   ├── register/page.tsx
        │   ├── onboarding/page.tsx
        │   ├── dashboard/page.tsx
        │   ├── layout.tsx
        │   └── globals.css        # Theme tokens (Claude orange palette)
        ├── components/
        │   ├── auth/
        │   │   ├── AuthLeft.tsx
        │   │   ├── FloatingDevIcons.tsx
        │   │   └── StatusOverlay.tsx
        │   └── ui/                # shadcn primitives
        └── lib/
            ├── api.ts             # fetch wrapper around backend
            └── utils.ts
```

---

## Prerequisites

Install these once on your machine:

| Tool        | Min version | Check                 |
| ----------- | ----------- | --------------------- |
| Python      | 3.11        | `python3 --version`   |
| Node.js     | 20.x        | `node --version`      |
| npm         | 10.x        | `npm --version`       |
| PostgreSQL  | 14          | `psql --version`      |

### macOS (Homebrew)

```bash
brew install python@3.11 node postgresql@16
brew services start postgresql@16
```

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip nodejs npm postgresql postgresql-contrib unzip
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Windows

- Install [Python 3.11](https://www.python.org/downloads/) (✅ tick "Add Python to PATH")
- Install [Node.js LTS](https://nodejs.org/)
- Install [PostgreSQL](https://www.postgresql.org/download/windows/)
- Use built-in Explorer to extract the zip, or 7-Zip.
- Run all commands inside **PowerShell**.

---

## Quick start (TL;DR)

You received the project as a **zip file** (e.g. `opensource.zip`). Extract it first.

```bash
# 1. Unzip the project
unzip opensource.zip          # macOS / Linux
# Windows PowerShell:
# Expand-Archive opensource.zip -DestinationPath .

cd opensource
```

### One-shot installers (recommended)

We ship installer scripts at the **project root** that handle everything automatically.

**macOS / Linux:**

```bash
# from inside the extracted opensource/ folder
bash setup-backend.sh        # creates Postgres DB + role, builds venv, installs requirements
bash setup-frontend.sh       # writes .env.local + npm install
```

**Windows** (double-click each, or from PowerShell / CMD):

```cmd
setup-backend.bat
setup-frontend.bat
```

Then run:

```bash
# Terminal 1 — backend
cd backend
source venv/bin/activate          # Windows: venv\Scripts\activate
uvicorn main:app --reload

# Terminal 2 — frontend
cd frontend
npm run dev
```

Open <http://localhost:3000> → **Get Started** → register → onboard → dashboard.

### Manual setup (if scripts can't run)

```bash
# 2. Database
createdb opensourcemate
createuser opensource          # may already exist; ignore "role exists" error

# 3. Backend
cd backend
python3.11 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload      # http://127.0.0.1:8000

# 4. Frontend (new terminal)
cd ../frontend
npm install
npm run dev                    # http://localhost:3000
```

Open <http://localhost:3000> → **Get Started** → register → onboard → dashboard.

---

## Backend setup

> Already extracted the zip? You should now have a folder called `opensource/` containing `backend/` and `frontend/` subfolders. All commands below assume you are inside that `opensource/` folder.

### 1. Create the PostgreSQL database

The default connection string in `backend/database.py` is:

```
postgresql://opensource@localhost/opensourcemate
```

So we need a user named `opensource` and a database named `opensourcemate`.

**macOS / Linux:**

```bash
# Make sure postgres is running
brew services start postgresql@16     # macOS
# or: sudo systemctl start postgresql # Linux

# Create the role (no password — local trust auth)
createuser opensource || true
createdb -O opensource opensourcemate
```

If the above asks for a password or fails with `peer authentication failed`, use the `postgres` superuser:

```bash
sudo -u postgres psql -c "CREATE USER opensource WITH PASSWORD 'opensource';"
sudo -u postgres psql -c "CREATE DATABASE opensourcemate OWNER opensource;"
```

Then update `backend/database.py`:

```python
DATABASE_URL = "postgresql://opensource:opensource@localhost/opensourcemate"
```

**Windows (PowerShell):**

```powershell
# Open psql with the default postgres user
psql -U postgres
# Inside psql:
CREATE USER opensource WITH PASSWORD 'opensource';
CREATE DATABASE opensourcemate OWNER opensource;
\q
```

Update `DATABASE_URL` to include the password as shown above.

Verify the DB exists:

```bash
psql -U opensource -d opensourcemate -c "\dt"
# (no tables yet — they're created on first run)
```

### 2. Python virtual environment + dependencies

```bash
cd backend
python3.11 -m venv venv

# Activate
source venv/bin/activate       # macOS / Linux
venv\Scripts\activate          # Windows PowerShell

# Install
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Run the backend

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

Tables are auto-created on startup via `Base.metadata.create_all(...)` in `main.py`.

**Verify:**

- Health: <http://127.0.0.1:8000/> → `{"status":"ok"}`
- Interactive docs: <http://127.0.0.1:8000/docs>

---

## Frontend setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. (Optional) Configure API URL

By default the frontend talks to `http://127.0.0.1:8000`. To override, create a `.env.local` file in `frontend/`:

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### 3. Run the frontend

```bash
npm run dev
```

Open <http://localhost:3000>.

### 4. Production build (optional)

```bash
npm run build
npm run start          # serves the production build on :3000
```

---

## Running the app

You need **two terminals** running simultaneously.

| Terminal | Directory  | Command                 | URL                       |
| -------- | ---------- | ----------------------- | ------------------------- |
| 1        | `backend/` | `uvicorn main:app --reload` | http://127.0.0.1:8000 |
| 2        | `frontend/`| `npm run dev`           | http://localhost:3000     |

### User flow

1. Visit <http://localhost:3000>
2. Click **Get Started** → register with email + password
3. Animated success splash → redirected to **Onboarding**
4. Welcome splash → fill 3-step wizard (name/mobile → role → website/LinkedIn)
5. Success splash → redirected to **Dashboard**
6. Sign out and log back in via **Sign in**

---

## API reference

Base URL: `http://127.0.0.1:8000`

### `POST /auth/register`

```json
// Request
{ "email": "you@example.com", "password": "secret123" }
// Response 201
{ "access_token": "<jwt>", "token_type": "bearer" }
```

### `POST /auth/login`

```json
// Request
{ "email": "you@example.com", "password": "secret123" }
// Response 200
{ "access_token": "<jwt>", "token_type": "bearer" }
```

### `POST /onboarding/`  (auth required)

```http
Authorization: Bearer <jwt>
Content-Type: application/json
```

```json
{
  "name": "Jane Doe",
  "mobile": "+1 555 123 4567",
  "user_type": "Freelancer",
  "website": "https://jane.dev",
  "linkedin": "https://linkedin.com/in/jane"
}
```

### `GET /dashboard/`  (auth required)

```http
Authorization: Bearer <jwt>
```

Returns the current user with `onboarding_completed` flag.

Full interactive docs: <http://127.0.0.1:8000/docs>

---

## Environment variables

### Backend

Currently hardcoded in source — for sharing with students this is fine. For real deployments, replace these:

| File                  | Value to change                                    |
| --------------------- | -------------------------------------------------- |
| `backend/database.py` | `DATABASE_URL`                                     |
| `backend/auth.py`     | `SECRET_KEY` (use a long random string in prod)    |
| `backend/main.py`     | `allow_origins` in `CORSMiddleware`                |

Generate a strong secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Frontend

Optional — only needed if backend isn't on `127.0.0.1:8000`:

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

## Common issues / troubleshooting

### ❌ `Failed to fetch` in the browser
Backend isn't running, or CORS isn't configured. Check:

```bash
curl -i http://127.0.0.1:8000/
curl -i -X OPTIONS http://127.0.0.1:8000/auth/register \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST"
```

The OPTIONS response must include `access-control-allow-origin: http://localhost:3000`.

### ❌ `psycopg2.OperationalError: FATAL: role "opensource" does not exist`
Create the role:

```bash
createuser opensource
# or
sudo -u postgres psql -c "CREATE USER opensource WITH PASSWORD 'opensource';"
```

### ❌ `database "opensourcemate" does not exist`

```bash
createdb -O opensource opensourcemate
```

### ❌ `port 8000 is already in use`

```bash
# macOS / Linux
lsof -ti:8000 | xargs kill -9
# Windows
netstat -ano | findstr :8000
taskkill /PID <pid> /F
```

### ❌ `port 3000 is already in use`
Run on a different port:

```bash
npm run dev -- -p 3001
```

…then add to `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

…and add `http://localhost:3001` to `allow_origins` in `backend/main.py`.

### ❌ `bcrypt` warnings on first install
Safe to ignore. We pin `bcrypt==4.0.1` for `passlib` compatibility.

### ❌ Next.js complains about Node version
Upgrade to Node 20 LTS:

```bash
# macOS
brew install node
# or with nvm
nvm install 20 && nvm use 20
```

### ❌ Tables not created
The backend creates tables on startup. If you changed `models.py`, drop and recreate:

```bash
dropdb opensourcemate && createdb -O opensource opensourcemate
# restart uvicorn
```

---

## Useful commands cheat sheet

### Backend

```bash
# Activate venv
source backend/venv/bin/activate            # macOS / Linux
backend\venv\Scripts\activate               # Windows

# Run dev server
uvicorn main:app --reload

# Run on a different port
uvicorn main:app --reload --port 8001

# Install a new package
pip install <name> && pip freeze > requirements.txt

# Open Postgres shell
psql -U opensource -d opensourcemate

# Reset DB
dropdb opensourcemate && createdb -O opensource opensourcemate
```

### Frontend

```bash
cd frontend
npm install            # install deps
npm run dev            # dev server (hot reload)
npm run build          # production build
npm run start          # serve production build
npm run lint           # eslint
```

### Distributing your changes back

Since this project is shared as a **zip**, you can package your work the same way:

```bash
# From the parent folder of opensource/
# Exclude virtualenvs, build artefacts, and node_modules so the zip stays small
zip -r opensource-yourname.zip opensource \
  -x "opensource/backend/venv/*" \
  -x "opensource/backend/__pycache__/*" \
  -x "opensource/backend/**/__pycache__/*" \
  -x "opensource/frontend/node_modules/*" \
  -x "opensource/frontend/.next/*"
```

On Windows (PowerShell):

```powershell
Compress-Archive -Path opensource -DestinationPath opensource-yourname.zip
# (then manually delete venv / node_modules / .next before zipping for smaller files)
```

---

## Notes for instructors / students

- Everything runs **locally** — no cloud accounts, no API keys required.
- The project is shared as a **zip file**. After extracting, the folder name might be `opensource/` or `opensource-main/` depending on how it was zipped — either is fine.
- Default JWT secret is committed for convenience; **rotate before deploying**.
- The animated UI uses Framer Motion + react-icons; styling is via Tailwind v4 theme tokens defined in `frontend/src/app/globals.css`.
- The brand accent (`--color-crimson`) is mapped to **Claude orange (#D97757)** — change the CSS variable to rebrand instantly.

Happy hacking! 🧡
