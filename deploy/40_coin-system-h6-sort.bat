@echo off
REM ============================================================
REM 40_coin-system-h6-sort.bat
REM
REM Phase H6 — Coin-System: Sortier-Layer + Visualisierung im
REM Marketplace.
REM
REM Aenderungen Backend (backend/src/index.ts):
REM   - Imports: getHighlightedListingIds, getFeedBoostedUserIds,
REM     isListingHighlighted aus lib/coins.js
REM   - GET /marketplace:
REM       Lade vor der Sortierung beide Sets parallel.
REM       Ranking-Score:
REM         featured (Stripe-Premium)             +1000
REM         coinFeedBoosted (Owner-FEED_BOOST)    +100
REM         coinHighlighted (Listing-HIGHLIGHT)   +10
REM         Tiebreaker: updatedAt DESC.
REM       Pro Listing in der Response zwei neue Bool-Flags:
REM         coinHighlighted, coinFeedBoosted.
REM
REM Aenderungen Frontend:
REM   - frontend/lib/api.ts:
REM       MarketplaceListingSchema +coinHighlighted/coinFeedBoosted
REM   - frontend/components/ListingCard.tsx:
REM       Bei coinHighlighted (und nicht featured) gelber 2px-Rand.
REM       Zwei neue Pills im Top-Left-Bereich:
REM         "Highlight" (gelb)  - wenn coinHighlighted
REM         "Boost"     (orange) - wenn coinFeedBoosted
REM       Premium hat visuell Vorrang; Coin-Highlight-Rand wird bei
REM       Premium nicht angezeigt, das Pill bleibt aber sichtbar.
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

git commit -m "feat(coins): Phase H6 Marketplace-Sort + ListingCard-Visualisierung"
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
echo  Phase H6 gepusht.
echo  Railway + Vercel bauen neu.
echo.
echo  Smoke-Test:
echo    1) /coins -^> Profile-Boost oder Feed-Boost auf Saldo nehmen,
echo       oder Listing-Highlight auf eigenes Inserat buchen.
echo    2) /marketplace -^> Inserat mit Highlight hat gelben Rand
echo       + "Highlight"-Pill. Inserate von Feed-Boost-Verkaeufern
echo       haben "Boost"-Pill und liegen im Feed weiter oben.
echo    3) Premium-Inserat (falls vorhanden) hat KEINEN gelben Rand
echo       (Premium-Border in indigo wuerde dominieren), aber das
echo       Highlight-Pill bleibt sichtbar.
echo.
echo  Naechster Schritt: BAT 41 = Phase H7 (Referral-Link
echo    ?ref=^<userId^> + Frontend-Onboarding-Anbindung).
echo ============================================================
echo.
pause
