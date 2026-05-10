@echo off
REM ============================================================
REM 69_rentals-l6-2-marketplace-frontend.bat
REM
REM Phase L6.2 — Oeffentliche Mietboerse: Frontend.
REM
REM NEUE FRONTEND-DATEIEN
REM   frontend/app/rental-marketplace/page.tsx
REM     - Liste aller AVAILABLE Mietobjekte (anonymisiert).
REM     - Filterbar: Stadt, min. Zimmer, max. Kaltmiete, min. Flaeche,
REM       moebliert, Haustiere erlaubt, barrierefrei.
REM     - Ergebnisliste als Karten mit Cover, Eckdaten, Highlights.
REM
REM   frontend/app/rental-marketplace/[id]/page.tsx
REM     - Detail-Page mit allen oeffentlich sichtbaren Feldern.
REM     - Adresse bleibt anonym (fullAddress wird vom Backend NIE
REM       geliefert).
REM     - Sidebar:
REM         * Eigentuemer-Mini.
REM         * Wenn Owner == Self: Hinweis + Link zu /rentals/[id].
REM         * Wenn schon beworben: Status + Link zu Meine Bewerbungen.
REM         * Sonst: <ApplyModal /> + AGG-Hinweis.
REM
REM   frontend/app/rental-marketplace/[id]/Gallery.tsx
REM     - Client-Component mit Lightbox + Thumbnail-Wechsel.
REM
REM   frontend/app/rental-marketplace/[id]/ApplyModal.tsx
REM     - Selbstbewerbungs-Modal.
REM     - Default-Werte (Name + E-Mail) aus /me vorbefuellt.
REM     - AGG-Banner: keine sensiblen Merkmale eintragen.
REM     - POST /rental-marketplace/:unitId/apply
REM
REM   frontend/app/me/applications-sent/page.tsx
REM     - "Meine Bewerbungen": Liste eigener gestellter Bewerbungen.
REM     - Status-Counts + Karten mit Cover, Eckdaten, Status-Pill.
REM
REM AENDERUNG SIDEBAR
REM   frontend/components/SideNav.tsx:
REM     - Section-Type bekommt zusaetzliche ID "rentSearch".
REM     - SECTION_RENT_SEARCH (Mietboerse + Meine Bewerbungen) wird
REM       fuer ALLE eingeloggten User gezeigt — egal welche Rolle.
REM       Begruendung: jeder kann mal privat eine Mietwohnung suchen.
REM
REM Kein Backend-Aenderung, kein Schema-Aenderung.
REM npm install nicht zwingend noetig, aber wir lassen es defensiv
REM mitlaufen (Lockfile-Sync).
REM
REM Naechster Schritt: BAT 70 = L7 (z.B. AGG-konformer Match-Score
REM oder Eigentuemer-Sicht "wer hat sich beworben — eingehende Inbox").
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

echo === Schritt 1: npm install (Lockfile-Sync) ===
echo.

call npm install
if errorlevel 1 (
    echo.
    echo FEHLER bei npm install. Pruefe Internet / Node-Version.
    pause
    exit /b 1
)

echo.
echo === Schritt 2: git ===
echo.

git status --short
echo.

git add -A
if errorlevel 1 (
    echo Fehler beim git add.
    pause
    exit /b 1
)

git commit -m "feat(rentals): Phase L6.2 oeffentliche Mietboerse + Selbstbewerbung (Frontend)"
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
echo  Phase L6.2 gepusht. Vercel baut neu (^~2 Min).
echo
echo  Verifikation:
echo    1. /rental-marketplace -^> Liste Mietobjekte (anonymisiert).
echo    2. Klick auf Inserat -^> Detail mit Galerie + Bewerben-Button.
echo    3. Bewerben -^> Modal -^> Bewerbung absenden -^>
echo       Sidebar zeigt "Bewerbung laeuft" mit Status NEU.
echo    4. /me/applications-sent zeigt die Bewerbung.
echo    5. Auf eigenem Inserat: kein Bewerben-Button, sondern Hinweis
echo       "Dein eigenes Inserat" + Link zu /rentals/[id].
echo
echo  Naechster Schritt: BAT 70 = L7 (Eigentuemer-Inbox /
echo  AGG-konformer Match-Score).
echo ============================================================
echo.
pause
