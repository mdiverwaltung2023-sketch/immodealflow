@echo off
REM ============================================================
REM 16_migrate-e1-rating.bat
REM Erzeugt die E1-Migration: Rating-Modell + RatingDirection Enum.
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
echo [2/2] Migration anlegen + anwenden (Name: add_rating) ...
call npx prisma migrate dev --name add_rating
if errorlevel 1 (
    echo.
    echo FEHLER bei prisma migrate dev.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  FERTIG. Migration unter:
echo  backend\prisma\migrations\<timestamp>_add_rating\
echo  Auf Railway wird sie beim naechsten Deploy automatisch
echo  via 'prisma migrate deploy' angewandt.
echo ============================================================
echo.
pause
