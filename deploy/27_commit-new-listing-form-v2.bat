@echo off
REM ============================================================
REM 27_commit-new-listing-form-v2.bat
REM
REM Anlegen-Formular (Inserat anlegen) auf das gleiche Niveau
REM wie der Editor gehoben:
REM
REM   Sektionen jetzt auch beim Anlegen verfuegbar:
REM     - Eckdaten (Pflicht: Titel, Stadt, Preis, Flaeche)
REM     - Bausubstanz (Baujahr, Sanierung, Zustand, GEG, ...)
REM     - Einheiten & Energie (WE/GE, Klasse, Traeger, Heizung)
REM     - Vermietung (Istmiete, Leerstand, WALT, Index/Staffel,
REM       Mietsteigerungspotenzial)
REM     - Mieter-Mix (Anchor-Tenant, Sektoren, Anzahl)
REM     - Provision & Tags (Features, Highlights)
REM
REM   Nach dem Anlegen springt die App direkt in den Edit-Modus,
REM   wo Bilder + Sichtbarkeit gepflegt werden koennen.
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

git commit -m "feat(frontend): NewListingForm mit allen Listing-v2-Sektionen"
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
echo  Push gelungen. Vercel baut Frontend (1-2 Minuten).
echo  Backend wird nicht angefasst -- dort ist alles schon
echo  bereit fuer die neuen Felder seit BAT 24/26.
echo.
echo  Test:
echo    https://infinityoikos.com/listings/new
echo  Du solltest 6 Sektionen sehen (Eckdaten + 5 erweiterte).
echo ============================================================
echo.
pause
