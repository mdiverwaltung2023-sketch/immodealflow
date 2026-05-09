@echo off
REM ============================================================
REM 37_coin-system-h3-hooks.bat
REM
REM Phase H3 — Coin-System: earn-Hooks in bestehende Endpoints.
REM
REM Aenderungen in backend/src/index.ts:
REM   - Imports: earn, todayUtcKey, isInvestorProfileCompleted,
REM     tryTriggerReferral, maybeMarkEarlyBird aus lib/coins.js
REM   - UserRoleEnum erweitert um BROKER
REM   - GET /me   -^> DAILY_LOGIN-earn (idempotent ueber UTC-Tag) +
REM     coinsBalance + isEarlyBird in Response
REM   - PATCH /me/profile -^> PROFILE_COMPLETED-earn (idempotent
REM     ueber refId="self") + tryTriggerReferral
REM   - POST  /me/listings -^> LISTING_ACTIVATED-earn fuer direkt
REM     ACTIVE-eingereichte Inserate (selten, aber moeglich)
REM   - PATCH /me/listings/:id -^> LISTING_ACTIVATED-earn beim
REM     Wechsel zu ACTIVE + tryTriggerReferral (Anti-Farming via
REM     Idempotenz pro Listing.id)
REM   - PATCH /me/inquiries/:id/respond -^> SELLER_CONTACTED-earn
REM     fuer den Investor (Anfrager)
REM   - POST  /me/complete-onboarding -^> akzeptiert optional
REM     referredById (Self-Referral verhindert), pflegt User.referredById
REM     ein und ruft maybeMarkEarlyBird bei role=BROKER
REM
REM Erweiterung in backend/src/lib/coins.ts:
REM   - PROFILE_COMPLETION_THRESHOLD = 7 von 8 Pflichtfeldern (ca. 88%)
REM   - computeInvestorProfileScore, isInvestorProfileCompleted
REM   - hasAnyActiveListing
REM   - tryTriggerReferral: prueft beide Bedingungen + earn(REFERRAL...)
REM
REM Wichtig: Alle Hooks sind in try/catch gewickelt, damit ein
REM Coin-Bug nicht den eigentlichen Endpoint zerstoert. Coin-Buchungen
REM laufen "best effort" — bei Fehler wird die HTTP-Response trotzdem
REM normal beantwortet.
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

git commit -m "feat(coins): Phase H3 earn-Hooks (DAILY_LOGIN, PROFILE_COMPLETED, LISTING_ACTIVATED, SELLER_CONTACTED, REFERRAL)"
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
echo  Phase H3 gepusht.
echo  Railway baut neu. Sobald gruen, vergibt das Backend Coins
echo  bei den 5 Earn-Events.
echo.
echo  Smoke-Test (manuell, ueber dein Login):
echo    1) GET /me  -^> sollte coinsBalance enthalten
echo       (1 Coin pro Tag, idempotent)
echo    2) PATCH /me/profile mit vollstaendigen Feldern
echo       -^> erstes Mal +100 Coins (PROFILE_COMPLETED)
echo    3) Listing PATCH status -^> ACTIVE
echo       -^> +10 Coins (LISTING_ACTIVATED, einmalig pro Listing)
echo    4) Listing-Anfrage beantworten als Verkaeufer
echo       -^> Investor bekommt +5 Coins (SELLER_CONTACTED)
echo.
echo  Naechster Schritt: BAT 38 = Phase H4 (Spend-Endpoint
echo    POST /me/coins/spend) + GET /me/coins.
echo ============================================================
echo.
pause
