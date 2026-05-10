@echo off
REM ============================================================
REM 55_market-analysis-k2-claude-lib.bat
REM
REM Phase K2 — KI-Library: zwei neue Funktionen in lib/claude.ts.
REM
REM Aenderungen in backend/src/lib/claude.ts:
REM
REM   - Type ListingMarketInput
REM       Strukturiertes Datenpaket aus Listing-Feldern (Eckdaten,
REM       Bausubstanz, Energie, Vermietung, Mieter-Mix, Provision,
REM       features/highlights/tenantSectors). Wird in beiden
REM       Funktionen unten genutzt.
REM
REM   - Helper listingDataAsBriefing(listing): string
REM       Serialisiert die Felder als deutsches Briefing-Format
REM       fuer den User-Message-Block. Beschreibung wird auf 1500
REM       Zeichen gekappt, damit Token-Budget passt.
REM
REM   - analyzeListingMarket(listing) -^> MarketAnalysisResult
REM       TEIL 1 des Marco-Prompts. Tool-Use mit 11 Pflicht-Feldern:
REM         priceConservative / priceFair / pricePremium (EUR),
REM         salesSpeed (FAST/NORMAL/DIFFICULT),
REM         demand (HIGH/MEDIUM/LOW),
REM         buyerSegments (max 6 Strings),
REM         recommendedAskingPrice, negotiationRange,
REM         marketingStrategy, risks (max 6), summary (max 5 Saetze).
REM       Temp 0.3, max 1600 Tokens.
REM
REM   - evaluateBuyerOffer({ listing, offerAmount, offerNote?,
REM       existingAnalysis? }) -^> OfferEvaluationResult
REM       TEIL 2 des Marco-Prompts. Tool-Use mit:
REM         attractiveness (SEHR_ATTRAKTIV/MARKTGERECHT/NIEDRIG/UNREALISTISCH),
REM         successProbability (0..1),
REM         recommendation (AKZEPTIEREN/GEGENANGEBOT/ABLEHNEN),
REM         counterOffer (optional EUR),
REM         negotiationHints, strategicAdvice.
REM       Temp 0.25, max 1000 Tokens. existingAnalysis (optional)
REM       liefert Kontext aus einer bereits gemachten Marktanalyse,
REM       damit der counterOffer konsistent zur Spanne bleibt.
REM
REM Beide Funktionen geben zusaetzlich model + rawJson zurueck —
REM rawJson wird in der DB als Audit-Snapshot persistiert.
REM
REM Voraussetzung: ANTHROPIC_API_KEY in Railway-ENV gesetzt
REM (war fuer die anderen Claude-Endpoints schon noetig).
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

git commit -m "feat(ki): Phase K2 lib/claude.ts +analyzeListingMarket +evaluateBuyerOffer"
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
echo  Phase K2 gepusht. Railway baut neu (^~2 Min).
echo  Funktionen sind live, aber noch nirgendwo aufgerufen — Build
echo  sollte sauber durchlaufen, API-Verhalten aendert sich nicht.
echo
echo  Naechster Schritt: BAT 56 = Phase K3 (Backend-Endpoints
echo    POST/GET /me/listings/:id/market-analysis und
echo    POST/GET /me/listings/:id/offer-evals).
echo ============================================================
echo.
pause
