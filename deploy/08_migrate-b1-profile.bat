@echo off
REM ============================================================
REM 08_migrate-b1-profile.bat
REM Erzeugt die B1-Migration: InvestorProfile + TrackrecordItem
REM Wendet sie direkt auf die in backend/.env hinterlegte DB an.
REM ============================================================

cd /d "%~dp0\..\backend"
echo.
echo === Backend-Ordner: %CD% ===
echo.

if not exist ".env" (
    echo FEHLER: backend\.env fehlt.
    pause
    exit /b 1
)

echo [1/2] Prisma Client generieren ...
call npx prisma generate
if errorlevel 1 (
    echo FEHLER bei prisma generate.
    pause
    exit /b 1
)

echo.
echo [2/2] Migration anlegen + anwenden (Name: add_investor_profile) ...
call npx prisma migrate dev --name add_investor_profile
if errorlevel 1 (
    echo.
    echo FEHLER bei prisma migrate dev.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  FERTIG. Migration liegt unter:
echo  backend\prisma\migrations\<timestamp>_add_investor_profile\
echo  Auf Railway wird sie beim naechsten Deploy automatisch
echo  via 'prisma migrate deploy' angewandt.
echo ============================================================
echo.
pause
