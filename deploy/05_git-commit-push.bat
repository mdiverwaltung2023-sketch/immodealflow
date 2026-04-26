@echo off
REM ============================================================
REM 05_git-commit-push.bat
REM Schneller Commit + Push aller aktuellen Aenderungen.
REM Praktisch nach kleinen Iterationen (Feature, Bugfix, etc.)
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

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
echo  Vercel und Railway deployen jetzt automatisch.
echo ============================================================
echo.
pause
