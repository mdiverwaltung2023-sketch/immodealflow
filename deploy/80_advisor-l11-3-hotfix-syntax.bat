@echo off
REM ============================================================
REM 80_advisor-l11-3-hotfix-syntax.bat
REM
REM Hotfix zu Phase L11.3 — Vercel-Build schlug fehl mit
REM Syntax-Error in app/verkaufen/page.tsx.
REM
REM URSACHE: FAQ-Eintrag enthielt das deutsche Anfuehrungszeichen
REM "Makler" mit ASCII-" mitten im umgebenden Doppel-Quote-String,
REM wodurch der String vorzeitig schloss. Selber Bug-Klasse wie bei
REM /mieten (BAT 75).
REM
REM FIX: Beide betroffene Strings (Frage + Antwort) mit Single-Quotes
REM umrahmen — Inhalt unveraendert.
REM
REM Reiner Frontend-Hotfix, kein Backend, keine Migration.
REM Da BAT 79 wahrscheinlich auch noch nicht durch ist (auch L11.3
REM Code), pusht git add -A jetzt alles zusammen.
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
echo === Prisma Client lokal regenerieren (fuer L11.3 Schema) ===
echo.

call npm run prisma:generate --workspace backend
if errorlevel 1 (
    echo.
    echo WARNUNG: prisma generate fehlgeschlagen — pruefe schema.prisma.
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

git commit -m "fix(advisor): Syntax-Fehler in verkaufen-FAQ behoben (Anfuehrungszeichen)"
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
echo  Hotfix gepusht. Vercel + Railway bauen neu (^~2 Min).
echo
echo  Verifikation:
echo    1. Vercel-Deployment muss diesmal "Ready" werden (gruen).
echo    2. Inkognito-Fenster: https://www.infinityoikos.com/verkaufen
echo       -^> Wizard mit 2 Pfaden (Selbst + Makler).
echo    3. Wizard ausfuellen, Makler-Empfehlung -^> Klick CTA
echo       oeffnet Lead-Form-Modal.
echo    4. Eingeloggt + Admin: /admin/broker-leads.
echo ============================================================
echo.
pause
