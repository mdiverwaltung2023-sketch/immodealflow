@echo off
REM ============================================================
REM push.bat  --  HAUPT-SKRIPT fuer Deploys
REM Commit + Push aller Aenderungen. Vercel und Railway
REM deployen danach automatisch.
REM Fuer jede Iteration (Feature, Bugfix, Doku) dieselbe BAT.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

if exist ".git\index.lock" del /F /Q ".git\index.lock"

git status --short
echo.

set /p MSG="Commit-Message: "
if "%MSG%"=="" (
    echo Keine Message angegeben - Abbruch.
    pause
    exit /b 1
)

git add -A
git commit -m "%MSG%"
if errorlevel 1 (
    echo.
    echo Nichts zu committen oder Fehler. Pruefe Output.
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
echo  Commit + Push erfolgreich.
echo  Vercel (Frontend) und Railway (Backend) deployen automatisch.
echo ============================================================
echo.
pause
