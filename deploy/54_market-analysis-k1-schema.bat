@echo off
REM ============================================================
REM 54_market-analysis-k1-schema.bat
REM
REM Phase K1 — KI-Marktanalyse + Angebotsbewertung: Schema + Migration.
REM
REM Aenderungen in backend/prisma/schema.prisma:
REM   - Enums:
REM       SaleSpeed (FAST, NORMAL, DIFFICULT)
REM       DemandLevel (HIGH, MEDIUM, LOW)
REM       OfferAttractiveness (SEHR_ATTRAKTIV, MARKTGERECHT, NIEDRIG, UNREALISTISCH)
REM       OfferRecommendation (AKZEPTIEREN, GEGENANGEBOT, ABLEHNEN)
REM   - Modell MarketAnalysis (1:1 mit Listing):
REM       Marktpreis-Spanne (priceConservative/Fair/Premium),
REM       salesSpeed, demand,
REM       buyerSegments (String[]),
REM       recommendedAskingPrice, negotiationRange, marketingStrategy,
REM       risks (String[]), summary,
REM       rawJson (komplette Claude-Antwort fuer Audit) + Token-Counts
REM   - Modell OfferEvaluation (n:1 zu Listing, optional 1:1 zu Inquiry):
REM       offerAmount + offerNote (Eingabe),
REM       attractiveness, successProbability (0..1), recommendation,
REM       counterOffer, negotiationHints, strategicAdvice (Output),
REM       rawJson + Indizes
REM   - Listing.marketAnalysis + Listing.offerEvaluations
REM   - Inquiry.offerEvaluations
REM
REM Migration 20260509180000_market_analysis_k1/migration.sql:
REM   - 4x CREATE TYPE
REM   - 2x CREATE TABLE (MarketAnalysis, OfferEvaluation)
REM   - FKs (CASCADE / SET NULL je nach Semantik)
REM   - Unique-Index auf MarketAnalysis.listingId
REM
REM npm install ist Pflicht (Lockfile-Sync, sonst Railway "npm ci"-Fail).
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

git commit -m "feat(ki): Phase K1 Schema + Migration (MarketAnalysis, OfferEvaluation)"
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
echo  Phase K1 gepusht.
echo  Railway baut neu mit "prisma migrate deploy" -^>
echo  legt MarketAnalysis und OfferEvaluation an.
echo
echo  Verifikation:
echo    Railway -^> Postgres -^> Tabellen "MarketAnalysis" und
echo    "OfferEvaluation" muessen sichtbar sein.
echo
echo  Naechster Schritt: BAT 55 = Phase K2 (lib/claude.ts erweitern
echo    um analyzeListingMarket + evaluateBuyerOffer mit Tool-Use).
echo ============================================================
echo.
pause
