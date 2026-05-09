@echo off
REM ============================================================
REM 38_coin-system-h4-spend.bat
REM
REM Phase H4 — Coin-System: Spend + Read Endpoints.
REM
REM Aenderungen in backend/src/index.ts:
REM   - Zusaetzliche Imports aus lib/coins: spend, listTransactions,
REM     listActiveSpends, EARN_AMOUNTS, SPEND_COSTS, EARLY_BIRD_LIMIT,
REM     EARLY_BIRD_MULTIPLIER, type SpendKind
REM   - GET /me/coins -^> liefert:
REM       balance, isEarlyBird, role, multiplier,
REM       transactions (letzte 50), activeSpends (validUntil ^> now),
REM       earnAmounts + spendCosts + earlyBirdLimit (Tarife fuer UI)
REM   - POST /me/coins/spend -^> body { kind, targetId? }
REM       Validiert kind ist SpendKind. Bei SPEND_LISTING_HIGHLIGHT:
REM       prueft Ownership + Status==ACTIVE des Listings.
REM       Ruft spend() aus lib/coins.ts. Bei insufficient_balance
REM       -^> 402 mit { balance, cost } fuer Frontend.
REM       Erfolg -^> { ok, spent, newBalance, validUntil, spendId, kind }.
REM
REM Wichtige Eigenschaften:
REM   - Atomar via conditional updateMany (siehe lib/coins.ts).
REM   - Schreibt CoinSpend (zeitlich befristete Buchung) + negative
REM     CoinTransaction in derselben DB-Transaktion.
REM   - Listing-Highlight nur auf eigenen ACTIVE-Inseraten.
REM   - PROFILE_BOOST/FEED_BOOST ignorieren targetId still.
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

git commit -m "feat(coins): Phase H4 GET /me/coins + POST /me/coins/spend"
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
echo  Phase H4 gepusht.
echo  Railway baut neu. Sobald gruen, sind die Spend-Endpoints
echo  verfuegbar.
echo.
echo  API-Smoke-Test (Curl-aehnlich, mit Clerk-Token):
echo    GET  /me/coins
echo      -^> { balance, transactions, activeSpends, earnAmounts, ... }
echo    POST /me/coins/spend  body: { "kind":"SPEND_PROFILE_BOOST" }
echo      -^> bei genug Saldo: { ok:true, spent:200, newBalance:..., validUntil }
echo      -^> sonst:           402 { error:"insufficient_coins", balance, cost }
echo    POST /me/coins/spend  body: { "kind":"SPEND_LISTING_HIGHLIGHT",
echo                                  "targetId":"^<deine-listing-id^>" }
echo      -^> 200 mit validUntil = now + 7 Tage
echo      -^> 404 wenn Listing nicht deins / nicht ACTIVE
echo.
echo  Naechster Schritt: BAT 39 = Phase H5 (Frontend /me/coins-Page +
echo    Spend-Buttons in Listing-Edit / Profile / Marketplace).
echo ============================================================
echo.
pause
