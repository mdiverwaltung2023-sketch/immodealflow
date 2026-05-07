@echo off
REM ============================================================
REM 19_fix-rating-form-quotes.bat
REM Fix Frontend-Build-Fehler in components/RatingForm.tsx:
REM Deutsches schliessendes Anfuehrungszeichen "" im JS-String
REM hat den String vorzeitig beendet -> SWC Parser-Fehler.
REM Fix: Backticks statt double-quotes fuer Placeholder-Strings.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

git status --short
echo.

git add frontend/components/RatingForm.tsx
if errorlevel 1 (
    echo Fehler beim git add.
    pause
    exit /b 1
)

git commit -m "fix(frontend): RatingForm Placeholder-Strings als Backticks (deutsche Quotes brachen Parser)"
if errorlevel 1 (
    echo.
    echo Nichts zu committen oder Fehler.
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
echo  Fix gepusht. Vercel baut jetzt neu (1-2 Minuten).
echo ============================================================
echo.
pause
