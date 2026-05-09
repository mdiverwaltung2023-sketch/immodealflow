@echo off
REM ============================================================
REM 51_sale-process-j3-frontend.bat
REM
REM Phase J3 — Verkaufsabwicklung: Frontend.
REM
REM Aenderungen:
REM
REM   - frontend/lib/api.ts:
REM       SaleStageEnum, SALE_STAGE_LABELS, SALE_STAGE_ORDER
REM       SaleDocKindEnum, SALE_DOC_LABELS, SALE_DOC_ORDER
REM       SaleDocumentSchema, SaleStageEntrySchema
REM       SaleProcessListItemSchema (Listen-Element)
REM       SaleProcessDetailSchema (am Ende der Datei wegen
REM         ListingSchema-Forward-Ref)
REM
REM   - frontend/app/api/upload-document/route.ts (neu):
REM       Vercel-Blob-Upload fuer PDF/DOC/XLS/Bilder bis 4 MB.
REM       Pathname sales/<userId>/<kind>/<ts>-<filename>.
REM
REM   - frontend/components/SideNav.tsx:
REM       SECTION_SELLER um "Verkaufsabwicklung" (/sales)
REM       erweitert + Briefcase-Icon.
REM
REM   - frontend/app/sales/page.tsx (Server Component):
REM       Liste mit drei Sektionen (Aktiv, Abgeschlossen, Abgebrochen),
REM       Progress-Bar pro Eintrag, Buyer-Mini, KPI-Pills oben.
REM
REM   - frontend/app/sales/[id]/page.tsx (Server Component):
REM       Detail-Seite mit Header, Stationen-Stepper, Eckdaten-Form,
REM       Dokumenten-Center, Verlauf-Liste.
REM
REM   - frontend/app/sales/[id]/StageStepper.tsx (Client):
REM       Klickbare 12er-Reihe der Stages, Modal fuer optionale
REM       Notiz, separater Abbrechen-Button.
REM
REM   - frontend/app/sales/[id]/DocumentCenter.tsx (Client):
REM       14 fixe Slots, je Hochladen / Ersetzen / Loeschen,
REM       Upload via /api/upload-document -^> POST .../documents.
REM
REM   - frontend/app/sales/[id]/ProcessFields.tsx (Client):
REM       agreedPrice, targetClosingDate, Notes — speichert via
REM       PATCH /me/sale-processes/:id.
REM
REM Voraussetzung: Vercel Blob Storage ist aktiviert (gleicher
REM Token wie fuer Bild-Upload BLOB_READ_WRITE_TOKEN).
REM
REM Keine neuen Dependencies, kein npm install noetig.
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

git commit -m "feat(sales): Phase J3 Frontend (/sales-Page, Stepper, DocCenter, Sidebar-Eintrag)"
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
echo  Phase J3 gepusht. Vercel baut neu (^~1-2 Min).
echo.
echo  Smoke-Test in der App:
echo    1) Sidebar zeigt jetzt "Verkaufsabwicklung" (Briefcase-Icon)
echo       in der Verkaeufer-Sektion.
echo    2) /sales -^> Liste deiner Verkaeufe (leer wenn keine).
echo       Falls du im Test eine Inquiry akzeptiert hast (J2),
echo       sollte hier ein Eintrag stehen.
echo    3) Klick auf einen Eintrag -^> /sales/<id>:
echo       - Stages-Stepper (Klick auf eine Stage = Status setzen)
echo       - Eckdaten-Form (agreedPrice, Datum, Notizen)
echo       - Dokumenten-Center (14 Slots, je hochladen)
echo       - Verlauf am Ende
echo
echo  Naechster Schritt: BAT 52 = Phase J4 (Off-Market-Trigger
echo    von der Listing-Edit-Page aus, optional) +
echo    Phase J5 (Dashboard rollenabhaengig — Verkaeufer-KPIs).
echo ============================================================
echo.
pause
