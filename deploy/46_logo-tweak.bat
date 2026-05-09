@echo off
REM ============================================================
REM 46_logo-tweak.bat
REM
REM Logo-Feinjustierung:
REM   - VISIBLE_FRACTION von 0.7 auf 0.6 -^> EIDOS wird sicher
REM     abgeschnitten (frueher war noch ein Rest sichtbar).
REM   - "OIKOS"-Schriftzug von Goldverlauf auf Indigo/Violet
REM     umgestellt -^> hebt sich klar gegen das goldene
REM     Logo-Bild ab und passt zur App-Farbpalette
REM     (Marketplace-Card, Buttons, Premium).
REM   - Mobile-TopBar gleich angepasst.
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

git commit -m "style(brand): EIDOS sauber abgeschnitten + OIKOS in Indigo/Violet"
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
echo  Tweak gepusht. Vercel baut neu (^~1-2 Min).
echo  EIDOS ist jetzt komplett abgeschnitten.
echo  OIKOS leuchtet in Indigo/Violet — kontrastiert klar
echo  zum goldenen Logo.
echo ============================================================
echo.
pause
