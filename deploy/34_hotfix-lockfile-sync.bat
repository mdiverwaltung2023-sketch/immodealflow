@echo off
REM ============================================================
REM 34_hotfix-lockfile-sync.bat
REM
REM Echter Build-Fehler aus den Railway-Logs:
REM   npm error Missing: stripe@17.7.0 from lock file
REM
REM Ursache: backend/package.json wurde um stripe^17.4.0 erweitert
REM (BAT 28), aber package-lock.json wurde nicht aktualisiert. Railway
REM nutzt "npm ci", was strikt Lockfile-Match verlangt -^> fail.
REM
REM Fix: Lokal "npm install" laufen lassen -^> npm aktualisiert
REM das Lockfile auf die kompatible Stripe-Version (17.7.0).
REM Danach Lockfile committen und pushen.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.
echo === Schritt 1: npm install (aktualisiert package-lock.json) ===
echo.

call npm install
if errorlevel 1 (
    echo.
    echo FEHLER bei npm install. Pruefe Internet / Node-Version.
    pause
    exit /b 1
)

echo.
echo === Schritt 2: git add + commit + push ===
echo.

git status --short
echo.

git add -A
if errorlevel 1 (
    echo Fehler beim git add.
    pause
    exit /b 1
)

git commit -m "fix(deps): package-lock.json sync (stripe + prisma generate)"
if errorlevel 1 (
    echo.
    echo Nichts zu committen oder Fehler.
    pause
    exit /b 1
)

git push
if errorlevel 1 (
    echo.
    echo FEHLER beim Push.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Hotfix gepusht. Railway baut neu mit korrektem Lockfile.
echo  In ~2 Minuten sollte das Deployment SUCCESSFUL sein.
echo  Dann sind alle Stripe-Endpoints live und der erste
echo  Smoke-Test auf /pricing kann starten.
echo ============================================================
echo.
pause
