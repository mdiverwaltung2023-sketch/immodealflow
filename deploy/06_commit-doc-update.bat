@echo off
REM ============================================================
REM 06_commit-doc-update.bat
REM Commit + Push der Doku-Aktualisierung (project_state.md + AGENTS.md)
REM nach Push A2.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

git status --short
echo.

git add project_state.md AGENTS.md
if errorlevel 1 (
    echo Fehler beim git add.
    pause
    exit /b 1
)

git commit -m "docs: project_state.md + AGENTS.md auf Stand Push A2 (Auth + Multi-Tenant)"
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
echo  Doku-Commit + Push erfolgreich.
echo  Kein Code geaendert -^> kein Re-Deploy noetig.
echo ============================================================
echo.
pause
