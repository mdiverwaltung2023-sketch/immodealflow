@echo off
REM ============================================================
REM 103_phase-m2-buyer-access-ui.bat
REM
REM Phase M2 — Verkaufsabwicklung 2.0, Schritt 2 (Frontend).
REM
REM Was passiert hier:
REM   1) Lockfile-Sync per "npm install" — keine neuen Dependencies,
REM      aber sicherheitshalber.
REM   2) Frontend Build-Check (next build) — verifiziert dass die
REM      neuen Komponenten kompilieren und die Public-Route registriert
REM      ist.
REM
REM Neu in M2:
REM   - frontend/app/zugang/[token]/page.tsx (Public-Page)
REM   - frontend/app/listings/[id]/edit/BuyerAccessManager.tsx
REM   - StageStepper.tsx horizontal auf Desktop
REM   - middleware.ts + ConditionalShell.tsx: /zugang(.*) public
REM
REM Keine Backend-Aenderungen, keine Migration.
REM
REM Nach diesem BAT: 104_commit-phase-m2.bat klicken.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

echo === [1/2] npm install (Lockfile-Sync) ===
call npm install
if errorlevel 1 (
    echo.
    echo FEHLER: npm install fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo === [2/2] Frontend Build-Check ===
cd frontend
call npm run build
if errorlevel 1 (
    echo.
    echo FEHLER: next build fehlgeschlagen — pruefe Output.
    pause
    exit /b 1
)
cd ..

echo.
echo === Fertig ===
echo Frontend kompiliert sauber.
echo Naechster Schritt: Klicke folgende BAT: 104_commit-phase-m2.bat
echo.
pause
