@echo off
REM ============================================================
REM 76_advisor-l11-sales-strategy.bat
REM
REM Phase L11.1 — KI-Verkaufsberater (Landing-Page + Wizard).
REM
REM POSITIONIERUNG
REM   Neutraler datengetriebener Verkaufsberater fuer Eigentuemer.
REM   "Selbst verkaufen oder Makler beauftragen?" — die Plattform
REM   gibt eine ehrliche Empfehlung mit drei Pfaden:
REM     SELBST   — Eigenvermarktung mit Investor-Club-Tools
REM     HYBRID   — Bausteine (Fotos, Notar, Bonitaets-Check) one-off
REM     MAKLER   — Vermittlung an verifizierte Makler im Netzwerk
REM
REM CONVERSION-HOOK
REM   Lokal gerechneter Wizard im Hero. User fuellt 8 Felder
REM   (Objektart, Lage, Zustand, Belegung, Anlass, Zeitrahmen,
REM   Erfahrung, geschaetzter Wert). Klick -> sofortige Empfehlung
REM   mit Score 0-100 je Pfad, Pro-/Contra-Faktoren, geschaetzter
REM   Provisions-Ersparnis (3,57 % DE-Durchschnitt).
REM
REM TONALITAET
REM   Modern, neutral, datengetrieben. KEINE Sales-Sprache. Die
REM   Heuristik ist transparent (Code im Repo) — die Plattform
REM   empfiehlt Makler nur, wenn Lage/Zustand/Komplexitaet ihn
REM   wirklich rechtfertigen.
REM
REM NEUE FRONTEND-DATEIEN
REM   frontend/app/(marketing)/lib/salesAdvisor.ts
REM     - Lokale Heuristik mit gewichteten Faktoren je Pfad.
REM     - 8 Faktoren -> Triple-Delta (selbst/hybrid/makler).
REM     - Liefert Scores, Top-Pro/Contra-Faktoren, Zeitspanne,
REM       Provisions-Ersparnis-Schaetzung.
REM
REM   frontend/app/(marketing)/components/AdvisorWizard.tsx
REM     - Single-Step Form. Nach Klick erscheint Result-Card mit
REM       3 Score-Bars, Pro/Contra-Listen, Stat-Tiles, szenario-
REM       spezifischen CTAs.
REM
REM   frontend/app/verkaufen/page.tsx
REM     - LP mit Hero (links Headline + CTAs, rechts Wizard),
REM       Trust-Strip, drei Path-Cards, How-It-Works, "Unsere
REM       Versprechen"-Block (warum neutral), FAQ, Footer-CTA.
REM
REM AENDERUNGEN BESTEHENDE FILES
REM   frontend/middleware.ts:
REM     - "/verkaufen(.*)" als public route.
REM   frontend/app/(marketing)/components/MarketingSections.tsx:
REM     - Nav + Footer um "Verkaufen?"-Link erweitert.
REM   frontend/app/page.tsx:
REM     - Hero-Hint "Du verkaufst eine Immobilie? Selbst, hybrid
REM       oder Makler? -^>" als Cross-Link zu /verkaufen.
REM
REM Kein Backend-Aenderung, keine Migration. Reiner Frontend-Push.
REM npm install defensiv mitlaufen lassen.
REM
REM Naechste Phase L11.2 (separat): Backend-Endpoint /sales-advisor/
REM verfeinert die Empfehlung mit Claude-Tool-Use, plus erste
REM Buchungs-Endpoints fuer die Hybrid-Bausteine (Fotos, Notar,
REM Bonitaets-Check).
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

git commit -m "feat(advisor): Phase L11 KI-Verkaufsberater LP mit 3-Pfad-Empfehlung (Selbst/Hybrid/Makler)"
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
echo  Phase L11.1 gepusht. Vercel baut neu (^~2 Min).
echo
echo  Verifikation:
echo    1. https://www.infinityoikos.com/verkaufen oeffnen.
echo    2. Wizard ausfuellen (z.B. ETW Berlin Top-Lage 80 m^2 2015,
echo       gepflegt, leer, freiwillig, kein Zeitdruck, viel Erfahrung,
echo       450.000 EUR) -^> Empfehlung sollte SELBST sein.
echo    3. Anderer Test: MFH Strukturschwach Sanierungsbedarf
echo       Erbschaft 3 Mon. keine Erfahrung -^> sollte MAKLER sein.
echo    4. Scroll: 3 Pfad-Karten sichtbar, "Unsere Versprechen"-Block,
echo       FAQ, Footer-CTA.
echo    5. Navi oben: "Verkaufen?" verlinkt zur Page.
echo    6. Startseite / hat Hero-Hint zur /verkaufen-Page.
echo
echo  Naechster Schritt L11.2: Claude-Endpoint /sales-advisor/
echo  fuer verfeinerte Empfehlung mit Mikromarkt-Daten + erste
echo  Hybrid-Buchungs-Endpoints (Fotos, Notar, Bonitaets-Check).
echo ============================================================
echo.
pause
