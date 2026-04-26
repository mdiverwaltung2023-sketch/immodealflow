@echo off
setlocal enabledelayedexpansion
REM ============================================================
REM 02b_env-setup.bat
REM Erzeugt backend\.env und frontend\.env.local interaktiv.
REM
REM VORAUSSETZUNG:
REM   - Railway-Projekt mit Postgres-Service ist angelegt
REM   - Du hast die "Public" DATABASE_URL aus Railway in die
REM     Zwischenablage kopiert
REM   - Du hast deinen Anthropic API-Key zur Hand
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

REM --- Backup vorhandener .env-Dateien ---------------------------
if exist "backend\.env" (
    copy /Y "backend\.env" "backend\.env.backup" >nul
    echo Bestehende backend\.env wurde nach backend\.env.backup gesichert.
    echo.
)
if exist "frontend\.env.local" (
    copy /Y "frontend\.env.local" "frontend\.env.local.backup" >nul
    echo Bestehende frontend\.env.local wurde nach frontend\.env.local.backup gesichert.
    echo.
)

REM --- DATABASE_URL abfragen -------------------------------------
echo --------------------------------------------------------------
echo  RAILWAY DATABASE_URL
echo  Im Railway-Dashboard:
echo    Postgres-Service -^> Variables -^> "DATABASE_PUBLIC_URL" anzeigen
echo    (NICHT die interne DATABASE_URL - die ist nur Railway-intern)
echo  Komplette URL kopieren (beginnt mit postgresql://) und einfuegen:
echo --------------------------------------------------------------
set /p DB_URL="DATABASE_URL: "
if "!DB_URL!"=="" (
    echo Keine URL angegeben - Abbruch.
    pause
    exit /b 1
)

REM --- ANTHROPIC_API_KEY abfragen --------------------------------
echo.
echo --------------------------------------------------------------
echo  ANTHROPIC API KEY
echo  https://console.anthropic.com -^> API Keys
echo  (beginnt mit sk-ant-...)
echo --------------------------------------------------------------
set /p ANTHROPIC_KEY="ANTHROPIC_API_KEY: "
if "!ANTHROPIC_KEY!"=="" (
    echo Kein Key angegeben - Abbruch.
    pause
    exit /b 1
)

REM --- backend\.env schreiben ------------------------------------
(
    echo DATABASE_URL="!DB_URL!"
    echo PORT=4000
    echo FRONTEND_ORIGIN="http://localhost:3000"
    echo ANTHROPIC_API_KEY="!ANTHROPIC_KEY!"
) > "backend\.env"

echo.
echo backend\.env geschrieben.

REM --- frontend\.env.local schreiben -----------------------------
(
    echo NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
) > "frontend\.env.local"

echo frontend\.env.local geschrieben.

REM --- Sicherheits-Check: sind die Dateien wirklich gitignored? --
git check-ignore backend\.env >nul 2>&1
if errorlevel 1 (
    echo.
    echo WARNUNG: backend\.env ist NICHT in .gitignore - Daten koennten
    echo          versehentlich committet werden! Bitte .gitignore pruefen.
)

echo.
echo ============================================================
echo  FERTIG. .env-Dateien sind angelegt.
echo  Naechster Schritt: 03_db-migrate.bat
echo  (erzeugt die initiale Prisma-Migration auf der Railway-DB)
echo ============================================================
echo.
pause
