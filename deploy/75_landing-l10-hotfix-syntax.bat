@echo off
REM ============================================================
REM 75_landing-l10-hotfix-syntax.bat
REM
REM Hotfix zu Phase L10 — Vercel-Build schlug fehl mit Syntax-Error
REM in app/mieten/page.tsx.
REM
REM URSACHE: FAQ-Frage "Was bedeutet „AGG-konform" konkret?" hatte
REM ein ASCII-" mitten im Doppel-Quote-String, was den String
REM vorzeitig schloss.
REM
REM FIX: String mit Single-Quotes umrahmen — Inhalt unveraendert.
REM Reiner Frontend-Hotfix, kein Backend, keine Migration.
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

git commit -m "fix(landing): Syntax-Fehler in mieten-FAQ behoben (AGG-Quote)"
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
echo  Hotfix gepusht. Vercel baut neu (^~2 Min).
echo
echo  Verifikation:
echo    1. Vercel-Build muss diesmal "Ready" werden (gruener Punkt).
echo    2. Inkognito-Fenster: https://www.infinityoikos.com/
echo       -^> neue Investor-LP mit Calculator.
echo    3. https://www.infinityoikos.com/mieten
echo       -^> neue Mieter-LP.
echo ============================================================
echo.
pause
