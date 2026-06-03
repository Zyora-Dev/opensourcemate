@echo off
REM OpenSourceMate - Frontend installer (Windows)
REM Installs Node dependencies and writes .env.local.
REM Usage:  double-click this file, or run:  setup-frontend.bat

setlocal

set "ROOT=%~dp0"
set "FRONTEND=%ROOT%frontend"
if "%NEXT_PUBLIC_API_URL%"=="" set "NEXT_PUBLIC_API_URL=http://127.0.0.1:8000"

echo.
echo =============================================
echo   OpenSourceMate - Frontend setup (Windows)
echo =============================================
echo.

if not exist "%FRONTEND%\package.json" (
  echo [X] frontend\package.json not found. Make sure this script is in the project root.
  pause & exit /b 1
)

REM ---------- 1. Node + npm ----------
echo [*] Checking Node.js (^>= 20)
where node >nul 2>&1
if errorlevel 1 (
  echo [X] Node.js not found. Install Node 20 LTS from https://nodejs.org/
  pause & exit /b 1
)
for /f "tokens=1 delims=." %%V in ('node -p "process.versions.node.split(\".\")[0]"') do set "NODEMAJOR=%%V"
if %NODEMAJOR% LSS 20 (
  echo [X] Node %NODEMAJOR% detected. Please upgrade to Node 20 or newer.
  pause & exit /b 1
)
node --version
echo [OK] Node OK.

where npm >nul 2>&1
if errorlevel 1 ( echo [X] npm not found. & pause & exit /b 1 )
npm --version
echo [OK] npm OK.

REM ---------- 2. .env.local ----------
cd /d "%FRONTEND%"
if exist .env.local (
  echo [OK] .env.local already exists - leaving as-is.
) else (
  echo.
  echo [*] Writing .env.local with API URL = %NEXT_PUBLIC_API_URL%
  > .env.local echo # Backend API URL used by the frontend.
  >> .env.local echo # Override by setting NEXT_PUBLIC_API_URL before running this script.
  >> .env.local echo NEXT_PUBLIC_API_URL=%NEXT_PUBLIC_API_URL%
  echo [OK] .env.local created.
)

REM ---------- 3. Install ----------
echo.
echo [*] Installing npm dependencies (this may take a minute)
call npm install --no-fund --no-audit
if errorlevel 1 ( echo [X] npm install failed. & pause & exit /b 1 )
echo [OK] Frontend dependencies installed.

echo.
echo =============================================
echo   Frontend setup complete!
echo =============================================
echo.
echo   To start the dev server:
echo     cd frontend
echo     npm run dev
echo.
echo   Then open: http://localhost:3000
echo   (Make sure the backend is running at %NEXT_PUBLIC_API_URL%)
echo.
pause
endlocal
