@echo off
setlocal enabledelayedexpansion
REM ============================================================
REM 07_install-and-migrate.bat
REM Installiert frische Dependencies (z. B. neu hinzugefuegtes
REM pdf-parse) und erzeugt + wendet eine Prisma-Migration an.
REM
REM Nutzen, wenn package.json um neue Pakete ergaenzt wurde
REM und gleichzeitig eine Schema-Migration faellig ist.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

echo [1/3] npm install (root + workspaces) ...
call npm install
if errorlevel 1 (
    echo FEHLER beim npm install.
    pause
    exit /b 1
)

cd backend

if not exist ".env" (
    echo FEHLER: backend\.env fehlt.
    pause
    exit /b 1
)

echo.
echo Migrationsname (kurz, snake_case, z.B. add_auctions):
set /p MIG_NAME="Name: "
if "!MIG_NAME!"=="" (
    echo Kein Name angegeben - Abbruch.
    pause
    exit /b 1
)

echo.
echo [2/3] Prisma Client generieren ...
call npx prisma generate
if errorlevel 1 (
    echo FEHLER bei prisma generate.
    pause
    exit /b 1
)

echo.
echo [3/3] Migration erzeugen + anwenden ...
call npx prisma migrate dev --name !MIG_NAME!
if errorlevel 1 (
    echo FEHLER bei prisma migrate dev.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  FERTIG. Dependencies + Migration angewandt.
echo  Naechster Schritt: 04_dev-start.bat zum Testen
echo                     oder direkt 05_git-commit-push.bat
echo ============================================================
echo.
pause
