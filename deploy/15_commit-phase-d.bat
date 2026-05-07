@echo off
REM ============================================================
REM 15_commit-phase-d.bat
REM Commit + Push der kompletten Phase D
REM (Inquiry-Modell + Backend-Endpoints + Frontend-Pages).
REM Setzt voraus, dass 14_migrate-d1-inquiry.bat schon gelaufen ist.
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

git commit -m "feat: Phase D - Inquiry-Flow (Verkaeufer sieht Investor-Profil bei Anfrage)"
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
echo  Railway baut jetzt automatisch (inkl. add_inquiry-Migration).
echo  Vercel baut Frontend automatisch.
echo  In 1-2 Minuten sollte /inquiries und /listings/<id>/inquiries
echo  funktionieren.
echo ============================================================
echo.
pause
