@echo off
REM ============================================================
REM 105_phase-m3-migrate.bat
REM
REM Phase M3 — In-App-Notifications + Inquiry-Auto-Fill + bunte
REM Stage-Icons.
REM
REM Schritte:
REM   1) npm install (Lockfile-Sync)
REM   2) prisma generate
REM   3) prisma migrate dev --name notifications_m3
REM   4) Frontend-Build (next build) zur Verifikation
REM
REM Nach Erfolg: 106_commit-phase-m3.bat klicken.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

echo === [1/4] npm install ===
call npm install
if errorlevel 1 (
    echo.
    echo FEHLER: npm install fehlgeschlagen.
    pause
    exit /b 1
)

cd backend

echo.
echo === [2/4] Prisma Client generieren ===
call npx prisma generate
if errorlevel 1 (
    echo FEHLER: prisma generate fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo === [3/4] Migration ausfuehren ===
call npx prisma migrate dev --name notifications_m3
if errorlevel 1 (
    echo FEHLER: prisma migrate dev fehlgeschlagen.
    echo Pruefe DATABASE_URL in backend\.env
    pause
    exit /b 1
)
cd ..

echo.
echo === [4/4] Frontend Build-Check ===
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
echo Migration angewandt + Frontend kompiliert sauber.
echo Naechster Schritt: Klicke folgende BAT: 106_commit-phase-m3.bat
echo.
pause
