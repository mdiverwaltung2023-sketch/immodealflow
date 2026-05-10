@echo off
REM ============================================================
REM 56_market-analysis-k3-endpoints.bat
REM
REM Phase K3 — Backend-Endpoints fuer KI-Marktanalyse + Angebots-
REM bewertung. Alle Endpoints sind ownership-gefiltert (Listing.ownerId
REM == req.userId).
REM
REM Aenderungen in backend/src/index.ts:
REM
REM   - Imports: analyzeListingMarket, evaluateBuyerOffer,
REM     ListingMarketInput-Typ aus lib/claude.js
REM
REM   - Helper listingToMarketInput(listing) — mappt DB-Listing
REM     auf ListingMarketInput fuer Claude
REM
REM   - GET    /me/listings/:id/market-analysis
REM       Liefert die letzte gespeicherte Analyse (404 wenn keine).
REM
REM   - POST   /me/listings/:id/market-analysis
REM       Erzeugt neue Analyse via Claude. Cache-Schutz: wenn juenger
REM       als 1 Stunde, wird die existierende zurueckgegeben (Flag
REM       cached:true). Mit ?force=true wird trotzdem regeneriert.
REM       503 wenn ANTHROPIC_API_KEY nicht gesetzt. Persistiert via
REM       Upsert auf MarketAnalysis (1 Eintrag pro Listing).
REM
REM   - DELETE /me/listings/:id/market-analysis
REM       Reset, z.B. nach groesserem Listing-Edit.
REM
REM   - GET    /me/listings/:id/offer-evals
REM       History aller Angebotsbewertungen fuer ein Listing
REM       (max 50, neueste zuerst).
REM
REM   - POST   /me/listings/:id/offer-evals
REM       body { offerAmount, offerNote?, inquiryId? }
REM       Bewertet ein konkretes Kaeufer-Angebot via Claude.
REM       Zieht (falls vorhanden) die existierende MarketAnalysis
REM       als zusaetzlichen Kontext fuer konsistente counterOffer.
REM       inquiryId wird nur akzeptiert, wenn sie zum Listing gehoert.
REM       Persistiert in OfferEvaluation (n:1 zu Listing, n Eintraege).
REM
REM Voraussetzung: ANTHROPIC_API_KEY in Railway-ENV gesetzt.
REM Ohne den Key antworten POST-Endpoints mit 503.
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

git commit -m "feat(ki): Phase K3 Endpoints fuer Marktanalyse + Angebotsbewertung"
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
echo  Phase K3 gepusht. Railway baut neu (^~2 Min).
echo
echo  Smoke-Test (REST-Client mit Clerk-Token):
echo    POST /me/listings/^<id^>/market-analysis
echo      -^> {"priceConservative":..., "priceFair":..., ... "summary":"..."}
echo    GET  /me/listings/^<id^>/market-analysis
echo      -^> dieselbe Antwort (cached)
echo    POST /me/listings/^<id^>/offer-evals
echo      body: {"offerAmount": 850000, "offerNote": "Familie X"}
echo      -^> {"attractiveness":"MARKTGERECHT","recommendation":"GEGENANGEBOT",
echo           "counterOffer":880000, ...}
echo    GET  /me/listings/^<id^>/offer-evals -^> History
echo
echo  Naechster Schritt: BAT 57 = Phase K4 (Frontend — zwei Cards
echo    auf der Listing-Edit-Page: KI-Marktanalyse + Angebot bewerten,
echo    plus History der Bewertungen).
echo ============================================================
echo.
pause
