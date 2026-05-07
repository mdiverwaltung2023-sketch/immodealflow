@echo off
REM ============================================================
REM 17_commit-phase-e.bat
REM Commit + Push der kompletten Phase E
REM (Rating-Modell + Backend-Endpoints + Frontend-Pages).
REM Setzt voraus, dass 16_migrate-e1-rating.bat schon gelaufen ist.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

git status --short
echo.

git add -A
if errorlevel 1 (
    echo Fehler beim git add.
    pause
    exit /b 1
)

git commit -m "feat: Phase E - Bewertungssystem (Rating nach SOLD-Deal, beide Richtungen, Gegendarstellung)"
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
echo  Railway baut automatisch (inkl. add_rating-Migration).
echo  Vercel baut Frontend automatisch.
echo  In 1-2 Minuten sollten Sterne-Anzeigen + Rating-Form
echo  fuer SOLD-Deals erscheinen.
echo ============================================================
echo.
pause
