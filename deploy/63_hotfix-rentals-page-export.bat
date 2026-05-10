@echo off
REM ============================================================
REM 63_hotfix-rentals-page-export.bat
REM
REM Hotfix fuer Phase L4 — Vercel-Build schlug fehl mit:
REM   "APPLICATION_STATUS_LABELS" is not a valid Page export field.
REM
REM Ursache: ich hatte am Ende von app/rentals/[id]/page.tsx
REM versehentlich einen Re-Export der Label-Maps stehen. Next.js
REM erlaubt in einer page.tsx aber nur die Default-Page-Komponente
REM plus ein paar Spezial-Exports (metadata, dynamic, revalidate,
REM generateStaticParams etc.) — keine beliebigen Re-Exports.
REM
REM Fix: Re-Exports entfernt + ungenutzte Imports
REM (APPLICATION_STATUS_LABELS, APPLICANT_RATING_LABELS) raus.
REM Die Labels werden weiterhin in den Sub-Komponenten
REM (ApplicationsSection, ApplicationStatusForm, ApplicantEvaluationCard)
REM direkt aus @/lib/api importiert — funktioniert genauso.
REM
REM Keine neuen Dependencies, kein npm install.
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

git commit -m "fix(rentals): Re-Exports aus page.tsx entfernt (Next.js Page-Type-Konformitaet)"
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
echo  Hotfix gepusht. Vercel baut neu (^~1-2 Min).
echo  Sobald Ready: Sidebar zeigt "Vermietung", /rentals erreichbar.
echo ============================================================
echo.
pause
