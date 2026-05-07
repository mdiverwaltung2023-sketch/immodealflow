@echo off
REM ============================================================
REM 09_commit-doc-update-b.bat
REM Commit + Push der Doku-Aktualisierung nach Push A3 + Phase B.
REM Aendert nur project_state.md - kein Re-Deploy noetig.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

git status --short
echo.

git add project_state.md
if errorlevel 1 (
    echo Fehler beim git add.
    pause
    exit /b 1
)

git commit -m "docs: project_state.md auf Stand Push A3 + Phase B (Investor-Profil + Trackrecord)"
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
