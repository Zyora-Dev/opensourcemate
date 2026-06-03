@echo off
REM OpenSourceMate - Backend installer (Windows)
REM Sets up Postgres DB/user, Python venv, and dependencies in one go.
REM Usage:  double-click this file, or run:  setup-backend.bat

setlocal enabledelayedexpansion

set "DB_NAME=opensourcemate"
set "DB_USER=opensource"
set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"

echo.
echo ============================================
echo   OpenSourceMate - Backend setup (Windows)
echo ============================================
echo.

if not exist "%BACKEND%\main.py" (
  echo [X] backend\main.py not found. Make sure this script is in the project root.
  pause & exit /b 1
)

REM ---------- 1. Python ----------
echo [*] Checking Python 3.11+
set "PY="
for %%P in (py python python3) do (
  if not defined PY (
    where %%P >nul 2>&1 && (
      for /f "tokens=2 delims= " %%V in ('%%P -V 2^>^&1') do (
        for /f "tokens=1,2 delims=." %%a in ("%%V") do (
          if %%a GEQ 3 if %%b GEQ 11 set "PY=%%P"
        )
      )
    )
  )
)
if not defined PY (
  echo [X] Python 3.11+ not found. Install from https://www.python.org/downloads/ and tick "Add Python to PATH".
  pause & exit /b 1
)
%PY% --version
echo [OK] Python found.

REM ---------- 2. Postgres ----------
echo.
echo [*] Checking PostgreSQL
where psql >nul 2>&1
if errorlevel 1 (
  echo [X] psql not found. Install PostgreSQL from https://www.postgresql.org/download/windows/ and add it to PATH.
  pause & exit /b 1
)
psql --version
echo [OK] psql found.

echo.
echo [*] Ensuring database "%DB_NAME%" and role "%DB_USER%" exist
echo     (You may be prompted for the postgres superuser password.)
psql -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='%DB_USER%'" 2>nul | findstr /b /c:"1" >nul
if errorlevel 1 (
  psql -U postgres -c "CREATE USER %DB_USER% WITH PASSWORD '%DB_USER%';" 2>nul
  echo [OK] Created role "%DB_USER%".
) else (
  echo [OK] Role "%DB_USER%" already exists.
)
psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='%DB_NAME%'" 2>nul | findstr /b /c:"1" >nul
if errorlevel 1 (
  psql -U postgres -c "CREATE DATABASE %DB_NAME% OWNER %DB_USER%;" 2>nul
  echo [OK] Created database "%DB_NAME%".
) else (
  echo [OK] Database "%DB_NAME%" already exists.
)

REM ---------- 3. venv + deps ----------
cd /d "%BACKEND%"
if exist venv\Scripts\activate.bat (
  echo [OK] venv\ already exists, reusing it.
) else (
  echo.
  echo [*] Creating virtual environment in venv\
  %PY% -m venv venv
  if errorlevel 1 ( echo [X] Failed to create venv. & pause & exit /b 1 )
  echo [OK] venv created.
)

call venv\Scripts\activate.bat

echo.
echo [*] Upgrading pip
python -m pip install --quiet --upgrade pip

echo [*] Installing requirements (this may take a minute)
pip install --quiet -r requirements.txt
if errorlevel 1 ( echo [X] pip install failed. & pause & exit /b 1 )
echo [OK] Python dependencies installed.

echo.
echo [*] Verifying app imports
python -c "import main; print('  main.py imports cleanly')"
if errorlevel 1 (
  echo [!] Backend import failed. Check Postgres connection in backend\database.py.
  echo     If you used a password other than "%DB_USER%", update DATABASE_URL there.
)

echo.
echo ============================================
echo   Backend setup complete!
echo ============================================
echo.
echo   To start the backend:
echo     cd backend
echo     venv\Scripts\activate
echo     uvicorn main:app --reload
echo.
echo   Then open: http://127.0.0.1:8000/docs
echo.
pause
endlocal
