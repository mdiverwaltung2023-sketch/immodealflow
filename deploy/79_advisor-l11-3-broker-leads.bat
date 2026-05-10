@echo off
REM ============================================================
REM 79_advisor-l11-3-broker-leads.bat
REM
REM Phase L11.3 — Hybrid raus, Makler-Lead-Form rein.
REM
REM AENDERUNGEN
REM
REM SCHEMA + MIGRATION
REM   backend/prisma/schema.prisma:
REM     - Neuer Enum BrokerLeadStatus (NEW, CONTACTED, QUALIFIED,
REM       CLOSED_WON, CLOSED_LOST).
REM     - Neues Model BrokerLead — anonyme Lead-Capture, ohne FK
REM       auf User. Snapshot der Wizard-Daten + Adresse + Score.
REM   Migration 20260510230000_l11_3_broker_lead:
REM     - CREATE TYPE BrokerLeadStatus
REM     - CREATE TABLE BrokerLead
REM     - Indizes auf (status, createdAt) und (city)
REM
REM BACKEND
REM   backend/src/lib/claude.ts:
REM     - refineSalesAdvice ohne Hybrid: nur reportSelbst +
REM       reportMakler. adjustedRecommendation auf SELBST/MAKLER/""
REM       reduziert.
REM
REM   backend/src/index.ts:
REM     - SalesAdvisorRefineSchema: heuristicScores ohne hybrid,
REM       heuristicRecommendation auf SELBST|MAKLER reduziert.
REM     - POST /sales-advisor/lead (PUBLIC, In-Memory Rate-Limit
REM       3/24h pro IP). Speichert BrokerLead.
REM     - GET  /admin/broker-leads (Admin-only, optional ?status=).
REM     - PATCH /admin/broker-leads/:id (Status oder internalNote).
REM
REM FRONTEND
REM   frontend/app/(marketing)/lib/salesAdvisor.ts (komplett neu):
REM     - Scenario-Type nur "SELBST" | "MAKLER" — Hybrid raus.
REM     - Heuristik-Faktoren als Pair statt Triple.
REM     - SCENARIO_LABELS / SCENARIO_TONES aktualisiert.
REM
REM   frontend/app/(marketing)/components/AdvisorWizard.tsx
REM     (komplett ueberarbeitet):
REM     - Ergebnis-Card mit 2 Score-Bars (Selbst + Makler).
REM     - KI-Bericht-Block: 2 Tiles (Selbst + Makler).
REM     - Bei MAKLER-Empfehlung: CTA-Button oeffnet jetzt ein
REM       Lead-Form-Modal (statt Sign-up-Redirect).
REM     - LeadFormModal:
REM         * Vor-/Nachname, E-Mail, Telefon (Pflicht)
REM         * Strasse, PLZ, Stadt (Pflicht)
REM         * Optionaler Notiz-Text
REM         * DSGVO-Checkbox (Pflicht)
REM         * Wizard-Eckdaten + Heuristik-Scores werden mitgesendet
REM         * KI-Bericht-Summary wird mitgesendet, falls vorher
REM           "KI-Bericht anfordern" geklickt wurde
REM         * POST /sales-advisor/lead -> Erfolg-Screen "Wir melden
REM           uns innerhalb von 24h"
REM
REM   frontend/app/verkaufen/page.tsx:
REM     - Drei-Pfade-Sektion -^> Zwei-Pfade-Sektion (Selbst + Makler).
REM     - Hybrid-Karte komplett entfernt.
REM     - "Unsere Versprechen"-Block ohne Hybrid-Punkt.
REM
REM   frontend/lib/api.ts:
REM     - BrokerLeadStatusEnum + BROKER_LEAD_STATUS_LABELS
REM     - BrokerLeadSchema fuer Admin-Liste
REM
REM   frontend/app/admin/broker-leads/page.tsx (neu):
REM     - Liste aller Leads mit Status-Filter.
REM     - Status-Counts oben.
REM
REM   frontend/app/admin/broker-leads/LeadList.tsx (neu):
REM     - Aufklappbare Karten pro Lead.
REM     - Inline Kontaktdaten (mailto/tel-Links).
REM     - Status-Buttons (NEW -^> CONTACTED -^> QUALIFIED -^> WON/LOST).
REM     - Interne Notiz-Textarea + Speichern.
REM
REM   frontend/components/SideNav.tsx:
REM     - Admin-Section um "/admin/broker-leads" erweitert.
REM
REM npm install ist Pflicht (Schema-Aenderung -^> Prisma-Client neu
REM generieren).
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
echo === Prisma Client lokal regenerieren ===
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

git commit -m "feat(advisor): Phase L11.3 Hybrid raus, Makler-Lead-Form + Admin-Liste"
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
echo  Phase L11.3 gepusht. Railway baut neu (^~2 Min, Migration
echo  laeuft), Vercel baut neu (^~2 Min).
echo
echo  Verifikation:
echo    1. /verkaufen aufrufen — nur 2 Pfad-Karten (Selbst + Makler).
echo    2. Wizard mit MFH/Sanierungsbedarf/Erbschaft/3M ausfuellen.
echo       -^> MAKLER empfohlen.
echo    3. Klick "Makler-Vermittlung anfordern" -^> Modal oeffnet sich.
echo    4. Form ausfuellen (Vor-/Nachname, E-Mail, Telefon, Adresse,
echo       DSGVO-Checkbox) -^> Anfrage absenden.
echo    5. Erfolgs-Screen "Wir melden uns innerhalb von 24h".
echo    6. Als Admin: /admin/broker-leads aufrufen.
echo       -^> Lead in der Liste mit Status NEU.
echo       -^> Aufklappen: alle Kontaktdaten + Eckdaten + Score sichtbar.
echo       -^> Status auf CONTACTED setzen, interne Notiz speichern.
echo    7. Sidebar (Admin): "Makler-Leads" als neuer Eintrag unter
echo       "Coin-Dashboard".
echo
echo  Anti-Spam: max. 3 Lead-Submits pro IP / 24h.
echo ============================================================
echo.
pause
