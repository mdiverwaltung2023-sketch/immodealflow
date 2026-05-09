@echo off
REM ============================================================
REM 39_coin-system-h5-frontend.bat
REM
REM Phase H5 — Coin-System: Frontend.
REM
REM Aenderungen:
REM   - frontend/lib/api.ts:
REM       UserRoleEnum +BROKER, USER_ROLE_LABELS BROKER,
REM       MeSchema +coinsBalance/isEarlyBird,
REM       CoinTxKindEnum, COIN_TX_LABELS, SpendKindEnum, EarnKindEnum,
REM       CoinTransactionSchema, CoinSpendSchema, CoinsViewSchema,
REM       SpendResultSchema
REM
REM   - frontend/app/coins/page.tsx (Server Component):
REM       laedt /me/coins, zeigt Balance + Early-Bird-Banner +
REM       aktive Boosts + Spend-Optionen + Earn-Tabelle + Verlauf.
REM
REM   - frontend/app/coins/CoinSpendOptions.tsx (Client Component):
REM       3 Spend-Karten (Listing-Highlight / Profile-Boost / Feed-Boost).
REM       Bei Listing-Highlight: Modal mit ACTIVE-Listings als Picker.
REM       402 Insufficient-Balance wird inline gezeigt.
REM
REM   - frontend/components/SideNav.tsx:
REM       neuer Eintrag "Meine Coins" zwischen Profil und Tarife,
REM       neues IcCoin-Icon.
REM
REM   - frontend/app/listings/[id]/edit/CoinHighlightButton.tsx:
REM       Coin-Highlight-Button (50 Coins / 7 Tage / gelber Rand) als
REM       Alternative zum Stripe-Premium. Holt /me/coins selbststaendig
REM       fuer Balance + aktiven Highlight-Status.
REM   - frontend/app/listings/[id]/edit/page.tsx:
REM       neuer Button unter dem Stripe-Premium-Block.
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

git commit -m "feat(coins): Phase H5 Frontend (/coins-Page, Spend-Options, Sidebar, Coin-Highlight-Button)"
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
echo  Phase H5 gepusht.
echo  Vercel baut neu (Frontend), in 1-2 Min sichtbar.
echo.
echo  Smoke-Test in der App:
echo    1) /coins  -^> du siehst dein Saldo (mind. 1+ vom DAILY_LOGIN)
echo    2) Profil ausfuellen -^> +100 Coins
echo    3) /coins  -^> Profile-Boost buchen (kostet 200, Saldo muss reichen)
echo    4) Inserat aktivieren -^> +10 Coins
echo    5) /listings/^<id^>/edit  -^> Coin-Highlight-Box sichtbar,
echo       50 Coins fuer 7 Tage gelber Rand
echo.
echo  Naechster Schritt: BAT 40 = Phase H6 (Sortier-Layer:
echo    Marketplace + Broker-Liste honorieren aktive Spends).
echo ============================================================
echo.
pause
