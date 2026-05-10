@echo off
REM ============================================================
REM 77_advisor-l11-2-claude-refine.bat
REM
REM Phase L11.2 — Claude-Refinement fuer den Verkaufsberater.
REM
REM Aufbau: Public Backend-Endpoint POST /sales-advisor/refine
REM (kein Auth, In-Memory Rate-Limit max 5/h pro IP). Bekommt die
REM Eckdaten + Heuristik-Output und gibt strukturiertes JSON zurueck:
REM   - reportSelbst / reportHybrid / reportMakler (je 2-3 Saetze)
REM   - riskFlags[] (2-4 Risiken)
REM   - specificTips[] (3-5 Handlungs-Tipps)
REM   - adjustedRecommendation (falls Claude widerspricht)
REM
REM AENDERUNG BACKEND
REM   backend/src/lib/claude.ts:
REM     - Neue Funktion refineSalesAdvice() mit Tool-Use auf Claude.
REM     - System-Prompt forciert Neutralitaet — Claude soll nicht
REM       reflexartig "Makler" empfehlen.
REM
REM   backend/src/index.ts:
REM     - Import erweitert (refineSalesAdvice + Type).
REM     - POST /sales-advisor/refine (PUBLIC, kein requireAuth-Mount).
REM     - In-Memory Rate-Limit Map (IP -^> count/window).
REM     - Zod-Validation auf Input.
REM
REM AENDERUNG FRONTEND
REM   frontend/app/(marketing)/components/AdvisorWizard.tsx:
REM     - State erweitert: lastInput (fuer Refine-Call) + refined +
REM       refining + refineErr.
REM     - "KI-Bericht anfordern"-Button im Result-Card.
REM     - Bei Klick: fetch /sales-advisor/refine mit Heuristik-Daten
REM     - Anzeige: 3 Bericht-Tiles (Selbst / Hybrid / Makler) +
REM       Risiken-Liste + Tipps-Liste.
REM     - Falls Claude die Empfehlung anpasst: prominenter Hinweis.
REM
REM Kein Schema-Aenderung, keine Migration. Reiner Code-Push.
REM npm install ist Pflicht (Lockfile-Sync mit Backend).
REM
REM Wichtig: ANTHROPIC_API_KEY in Railway muss gesetzt sein —
REM ist es bereits (laeuft schon fuer andere KI-Aufrufe).
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

git commit -m "feat(advisor): Phase L11.2 Claude-Refinement fuer Verkaufsberater (public Endpoint mit Rate-Limit)"
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
echo  Phase L11.2 gepusht. Railway baut neu (^~2 Min, Backend-Code),
echo  Vercel baut neu (^~2 Min, Frontend).
echo
echo  Verifikation:
echo    1. /verkaufen aufrufen, Wizard ausfuellen, Empfehlung
echo       erscheint (lokal gerechnet, sofort).
echo    2. Im Result-Card: Klick "KI-Bericht anfordern".
echo       -^> Spinner "Analysiere..." (3-5 Sek)
echo       -^> Drei Pfad-Tiles erscheinen mit freitextlichem
echo          Bericht je Pfad
echo       -^> Risiken-Liste + Tipps-Liste darunter
echo    3. Bei extremen Test-Profilen kann Claude die Heuristik
echo       in seltenen Faellen ueberstimmen — dann erscheint
echo       prominenter "Claude weicht ab"-Hinweis.
echo    4. Mehr als 5 Anfragen pro Stunde -^> 429-Fehler mit
echo       freundlicher Meldung.
echo
echo  Falls 503-Fehler: ANTHROPIC_API_KEY auf Railway pruefen.
echo  Falls 429: 1 Stunde warten oder anderen Browser/Netzwerk.
echo ============================================================
echo.
pause
