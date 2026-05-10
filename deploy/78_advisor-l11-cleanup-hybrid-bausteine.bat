@echo off
REM ============================================================
REM 78_advisor-l11-cleanup-hybrid-bausteine.bat
REM
REM Cleanup zu Phase L11 — konkrete Hybrid-Bausteine raus.
REM
REM Hintergrund: Workflows fuer Profi-Fotos, Notar-Vorbereitung
REM und Bonitaets-Check sind noch nicht aufgesetzt — keine
REM Lieferung moeglich. Konkrete EUR-Versprechen werden daher
REM von der Landing-Page und aus dem Wizard-CTA entfernt.
REM
REM Auch der Makler-Pfad wird ehrlicher: aktuell kein Netzwerk —
REM CTA "Empfehlung speichern" statt "Makler-Vermittlung".
REM
REM AENDERUNGEN
REM   frontend/app/verkaufen/page.tsx:
REM     - Hybrid-PathCard: Bullets generisch ("Du uebernimmst Inserat,
REM       Besichtigungen und Verhandlung. Plattform-Tools aus dem
REM       Investor Club bleiben dein Werkzeug. Punktuelle Premium-
REM       Bausteine kommen schrittweise dazu."). Keine Preis-
REM       Versprechen mehr.
REM     - Makler-PathCard: ehrliche Sprache ("Wir bauen aktuell ein
REM       Netzwerk verifizierter Makler auf"). CTA "Empfehlung
REM       speichern" statt "Makler-Vermittlung".
REM
REM   frontend/app/(marketing)/components/AdvisorWizard.tsx:
REM     - HYBRID-Szenario-CTA: keine konkreten Bausteine mehr,
REM       Hinweis "kommen schrittweise dazu".
REM     - MAKLER-Szenario-CTA: "Empfehlung speichern" statt
REM       "Makler-Empfehlung anfordern".
REM
REM Keine Backend-Aenderung. Reiner Frontend-Cleanup.
REM
REM Falls Phase L11.2 (Claude-Refinement) noch nicht gepushed war:
REM dieser Push enthaelt das auch — git add -A nimmt alle aktuellen
REM Aenderungen mit. Railway baut also ggf. das Backend mit, Vercel
REM das Frontend.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

call npm install
if errorlevel 1 (
    echo.
    echo FEHLER bei npm install. Pruefe Internet / Node-Version.
    pause
    exit /b 1
)

echo.
echo === git ===
echo.

git status --short
echo.

git add -A
if errorlevel 1 (
    echo Fehler beim git add.
    pause
    exit /b 1
)

git commit -m "cleanup(advisor): konkrete Hybrid-Bausteine raus, Makler-Pfad ehrlicher (Netzwerk in Aufbau)"
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
echo  Cleanup gepusht. Vercel baut neu (^~2 Min).
echo
echo  Verifikation:
echo    1. /verkaufen aufrufen, scroll zur 3-Pfade-Sektion.
echo    2. Hybrid-Karte hat KEINE Preise mehr (kein "199 EUR" etc.).
echo    3. Makler-Karte sagt "Wir bauen aktuell ein Netzwerk auf".
echo    4. Wizard ausfuellen mit MFH/Erbschaft -^> Makler-CTA
echo       sagt "Empfehlung speichern", nicht "Vermittlung anfordern".
echo ============================================================
echo.
pause
