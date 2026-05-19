@echo off
REM ============================================================
REM 107_phase-m4-build.bat
REM
REM Phase M4 — Discoverability + Investor-Direkt-Sicht.
REM Backend hat neue Endpoints + Auto-Bind im Public-Endpoint.
REM Frontend hat /freigaben, /empfangene-freigaben, Dashboard-Card,
REM Sidebar-Erweiterungen.
REM
REM Keine Schema-/Migration-Aenderung — reiner Code-Add.
REM
REM Schritte:
REM   1) npm install (Lockfile-Sync, sicherheitshalber)
REM   2) Frontend Build-Check (next build)
REM
REM Backend wird durch Railway-Build automatisch neu kompiliert beim
REM Push (tsc).
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

echo === [1/2] npm install ===
call npm install
if errorlevel 1 (
    echo FEHLER: npm install fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo === [2/2] Frontend Build-Check ===
cd frontend
call npm run build
if errorlevel 1 (
    echo FEHLER: next build fehlgeschlagen.
    pause
    exit /b 1
)
cd ..

echo.
echo === Fertig ===
echo Naechster Schritt: Klicke folgende BAT: 108_commit-phase-m4.bat
echo.
pause
