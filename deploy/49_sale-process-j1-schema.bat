@echo off
REM ============================================================
REM 49_sale-process-j1-schema.bat
REM
REM Phase J1 — Verkaufsabwicklung: Schema + Migration.
REM
REM Aenderungen in backend/prisma/schema.prisma:
REM   - Enum SaleStage (13 Werte: ANFRAGE_AKZEPTIERT ... ABGESCHLOSSEN
REM     plus Off-Track-Status ABGEBROCHEN)
REM   - Enum SaleDocKind (14 Kategorien: GRUNDBUCH, ENERGIEAUSWEIS,
REM     FLURKARTE, WOHNFLAECHENBERECHNUNG, KAUFVERTRAG_ENTWURF,
REM     KAUFVERTRAG_BEURKUNDET, VORFAELLIGKEITSSCHREIBEN,
REM     AUFLASSUNGSVORMERKUNG, UEBERGABEPROTOKOLL,
REM     TEILUNGSERKLAERUNG, EIGENTUEMERVERSAMMLUNG_PROTOKOLL,
REM     MIETVERTRAEGE, MAKLERVERTRAG, SONSTIGES)
REM   - Modell SaleProcess (1:1 mit Inquiry optional, n:1 zu Listing,
REM     n:1 zu seller+buyer User, currentStage + Stage-Audit-Log)
REM   - Modell SaleStageEntry (Audit-Timeline jeder Stage-Aenderung)
REM   - Modell SaleDocument (1 Dokument pro process+kind, Vercel-Blob-URL)
REM   - User-Back-Relations: saleProcessesAsSeller, saleProcessesAsBuyer,
REM     saleStageEntries, uploadedSaleDocs
REM   - Listing.saleProcesses, Inquiry.saleProcess
REM
REM Migration 20260509120000_sale_process_j1/migration.sql:
REM   - 2x CREATE TYPE (SaleStage, SaleDocKind)
REM   - 3x CREATE TABLE (SaleProcess, SaleStageEntry, SaleDocument)
REM   - alle FKs (CASCADE / SET NULL je nach Semantik)
REM   - Indizes inkl. Unique (inquiryId, processId+kind)
REM
REM npm install ist Pflicht: Lockfile-Sync, sonst scheitert
REM Railway "npm ci".
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
echo === Schritt 2: Prisma Client lokal regenerieren ===
echo.

call npm run prisma:generate --workspace backend
if errorlevel 1 (
    echo.
    echo WARNUNG: prisma generate fehlgeschlagen — pruefe schema.prisma.
    pause
    exit /b 1
)

echo.
echo === Schritt 3: git ===
echo.

git status --short
echo.

git add -A
if errorlevel 1 (
    echo Fehler beim git add.
    pause
    exit /b 1
)

git commit -m "feat(sales): Phase J1 Schema + Migration (SaleProcess, SaleStageEntry, SaleDocument)"
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
echo  Phase J1 gepusht.
echo  Railway baut neu mit "prisma migrate deploy" -^>
echo  legt SaleProcess/SaleStageEntry/SaleDocument an.
echo.
echo  Verifikation:
echo    Railway -^> Postgres -^> Tabellen "SaleProcess",
echo    "SaleStageEntry", "SaleDocument" muessen sichtbar sein.
echo.
echo  Naechster Schritt: BAT 50 = Phase J2 (Backend-Endpoints
echo    fuer Anlegen, Stage-Update, Dokumenten-Upload).
echo ============================================================
echo.
pause
