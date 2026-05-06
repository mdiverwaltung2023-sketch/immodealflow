@echo off
REM ============================================================
REM 07_migrate-a3-onboarding.bat
REM Erzeugt die A3-Migration: User.onboardingCompletedAt
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
echo [2/2] Migration anlegen + anwenden (Name: add_user_onboarding) ...
call npx prisma migrate dev --name add_user_onboarding
if errorlevel 1 (
    echo.
    echo FEHLER bei prisma migrate dev.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  FERTIG. Migration liegt unter:
echo  backend\prisma\migrations\<timestamp>_add_user_onboarding\
echo  Auf Railway wird sie beim naechsten Deploy automatisch
echo  via 'prisma migrate deploy' angewandt.
echo ============================================================
echo.
pause
