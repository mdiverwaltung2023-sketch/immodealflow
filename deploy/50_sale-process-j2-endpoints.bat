@echo off
REM ============================================================
REM 50_sale-process-j2-endpoints.bat
REM
REM Phase J2 — Verkaufsabwicklung: Backend-Endpoints.
REM
REM Aenderungen in backend/src/index.ts:
REM
REM Auto-Hook in PATCH /me/inquiries/:id/respond:
REM   Bei body.status="ACCEPTED" wird automatisch ein SaleProcess
REM   angelegt (sofern noch keiner zur Inquiry existiert), plus
REM   ersten SaleStageEntry. Verkaeufer-Sicht zeigt sofort den
REM   neuen Verkauf in der Pipeline.
REM
REM Neue Endpoints (alle sellerId-gefiltert):
REM
REM   GET    /me/sale-processes
REM     ?stage=X      filter auf Stage
REM     ?active=true  nur nicht-ABGESCHLOSSEN/ABGEBROCHEN
REM     -^> Liste mit listing-Mini, buyer-Mini, _count(documents,stageLog)
REM
REM   GET    /me/sale-processes/:id
REM     -^> Detail mit listing, buyer, inquiry, documents, stageLog (50)
REM
REM   POST   /me/listings/:listingId/sale-processes
REM     body { buyerId?, agreedPrice?, notes? }
REM     -^> Manuelles Anlegen (z.B. Off-Market-Deal ohne Marketplace-Anfrage)
REM
REM   PATCH  /me/sale-processes/:id
REM     body { notes?, agreedPrice?, targetClosingDate?, buyerId? }
REM     -^> Generelle Feld-Updates
REM
REM   PATCH  /me/sale-processes/:id/stage
REM     body { stage, note? }
REM     -^> Stage wechseln + Audit-Eintrag in SaleStageEntry
REM
REM   POST   /me/sale-processes/:id/documents
REM     body { kind, url, filename, sizeBytes }
REM     -^> Upsert pro (process, kind): Re-Upload ueberschreibt
REM     Vercel-Blob-Upload macht das Frontend, hier kommt nur die URL.
REM
REM   DELETE /me/sale-processes/:id/documents/:kind
REM     -^> Dokument einer Kategorie loeschen
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

git commit -m "feat(sales): Phase J2 SaleProcess-Endpoints + Auto-Hook beim ACCEPT"
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
echo  Phase J2 gepusht.
echo  Railway baut neu (^~2 Min).
echo.
echo  Smoke-Test (per Backend-Konsole oder REST-Client):
echo    1) Eine PENDING-Anfrage akzeptieren -^> in Postgres
echo       SaleProcess-Eintrag mit currentStage=ANFRAGE_AKZEPTIERT
echo       und SaleStageEntry-Eintrag muessen entstehen.
echo    2) GET /me/sale-processes -^> Liste mit dem neuen Eintrag
echo    3) PATCH .../stage  body { "stage":"BESICHTIGUNG" }
echo       -^> currentStage geaendert + neuer Audit-Eintrag
echo    4) POST .../documents  body { kind, url, filename, sizeBytes }
echo       -^> Document-Eintrag in DB
echo.
echo  Naechster Schritt: BAT 51 = Phase J3 (Frontend /sales-Page +
echo    Stage-Stepper + Doc-Upload-UI).
echo ============================================================
echo.
pause
