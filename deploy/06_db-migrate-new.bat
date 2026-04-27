@echo off
setlocal enabledelayedexpansion
REM ============================================================
REM 06_db-migrate-new.bat
REM Erzeugt eine neue Prisma-Migration aus geaenderten
REM Schema (backend/prisma/schema.prisma) und wendet sie sofort
REM auf die in backend/.env hinterlegte DB an.
REM
REM Anders als 03_db-migrate.bat: fragt nach einem Migrationsnamen
REM und ist fuer alle weiteren Migrationen nach der ersten gedacht.
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

echo Migrationsname (kurz, snake_case, z.B. add_status_and_notes):
set /p MIG_NAME="Name: "
if "!MIG_NAME!"=="" (
    echo Kein Name angegeben - Abbruch.
    pause
    exit /b 1
)

echo.
echo [1/2] Prisma Client generieren ...
call npx prisma generate
if errorlevel 1 (
    echo FEHLER bei prisma generate.
    pause
    exit /b 1
)

echo.
echo [2/2] Migration erzeugen + anwenden (--name !MIG_NAME!) ...
call npx prisma migrate dev --name !MIG_NAME!
if errorlevel 1 (
    echo.
    echo FEHLER bei prisma migrate dev.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  FERTIG. Migration angewandt.
echo  Naechster Schritt: ggf. Backend redeployen via 05_git-commit-push.bat
echo ============================================================
echo.
pause
