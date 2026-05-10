@echo off
REM ============================================================
REM 57_market-analysis-k4-frontend.bat
REM
REM Phase K4 — Frontend fuer KI-Marktanalyse + Angebotsbewertung.
REM Damit ist Phase K (K1-K4) komplett.
REM
REM Aenderungen:
REM
REM   - frontend/lib/api.ts:
REM       SaleSpeedEnum, DemandLevelEnum, OfferAttractivenessEnum,
REM       OfferRecommendationEnum + Labels
REM       MarketAnalysisSchema, OfferEvaluationSchema
REM
REM   - frontend/app/listings/[id]/edit/MarketAnalysisCard.tsx (neu):
REM       Holt /me/listings/:id/market-analysis (cached).
REM       Button "KI-Analyse erstellen" -^> POST -^> Zeigt:
REM         - 3-Spalten Preisspanne (konservativ / marktgerecht / premium)
REM         - empfohlener Angebotspreis + Verhandlungsspielraum
REM         - Speed + Demand als Mini-Tiles
REM         - Käufer-Zielgruppen als Pills
REM         - Vermarktungsstrategie
REM         - Risiken-Liste
REM         - 5-Satz-Zusammenfassung als Italic-Quote
REM         - "Neu generieren"-Button (force=true)
REM       Disclaimer prominent unten: keine Echtzeit-Marktdaten,
REM       kein Wertgutachten.
REM
REM   - frontend/app/listings/[id]/edit/OfferEvaluationCard.tsx (neu):
REM       Form: offerAmount + offerNote -^> POST -^> Ergebnis
REM       wird oben in History gepushed.
REM       Pro Eintrag: Betrag, Attraktivitaets-Badge (gefaerbt),
REM       Empfehlung-Pill, Erfolgswahrscheinlichkeit als Bar,
REM       Gegenangebot-Box, Verhandlungshinweise, strategische
REM       Empfehlung als Italic-Quote.
REM       Disclaimer unten.
REM
REM   - frontend/app/listings/[id]/edit/page.tsx:
REM       MarketAnalysisCard und OfferEvaluationCard zwischen
REM       StartSaleProcessButton und ListingEditor eingebunden.
REM
REM Voraussetzung: ANTHROPIC_API_KEY in Railway-ENV gesetzt
REM (sonst antwortet das Backend mit 503).
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

git commit -m "feat(ki): Phase K4 Frontend — MarketAnalysisCard + OfferEvaluationCard"
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
echo  Phase K4 gepusht. Damit ist Phase K (K1-K4) komplett.
echo  Vercel baut neu (^~1-2 Min).
echo
echo  Smoke-Test in der App:
echo    1) /listings/^<id^>/edit auf einem deiner Inserate
echo    2) "KI-Preiseinschaetzung"-Card -^> Button klicken,
echo       ca. 5-15 Sek. spaeter erscheint die Analyse.
echo    3) "Angebot bewerten lassen"-Card -^> Betrag eintippen
echo       (z.B. 850000), optional Notiz, "Bewerten" klicken.
echo       Resultat erscheint als History-Eintrag oben.
echo
echo  Check: ANTHROPIC_API_KEY muss in Railway-ENV gesetzt sein.
echo  Falls 503-Fehler kommt, dort ergaenzen und Backend re-deployen.
echo ============================================================
echo.
pause
