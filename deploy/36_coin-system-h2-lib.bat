@echo off
REM ============================================================
REM 36_coin-system-h2-lib.bat
REM
REM Phase H2 — Coin-System: Library lib/coins.ts
REM
REM Was passiert:
REM   - backend/src/lib/coins.ts neu (~330 Zeilen)
REM     Exportiert:
REM       - Konstanten EARN_AMOUNTS, SPEND_COSTS,
REM         EARLY_BIRD_LIMIT=100, EARLY_BIRD_MULTIPLIER=1.5
REM       - earn(userId, kind, refId, note?)  (idempotent via P2002)
REM       - spend(userId, kind, targetId?)    (atomar via conditional updateMany)
REM       - getBalance, listTransactions, listActiveSpends
REM       - Sortier-Helpers: isListingHighlighted, getHighlightedListingIds,
REM         hasProfileBoost, hasFeedBoost, getProfileBoostedUserIds,
REM         getFeedBoostedUserIds
REM       - maybeMarkEarlyBird (BROKER + Count-Check)
REM       - todayUtcKey  (DAILY_LOGIN-Idempotenz)
REM
REM Keine neuen Dependencies, kein npm install noetig — nur ein neues
REM TS-File. Railway baut neu, aber tsc kompiliert nur die neue Datei
REM zusaetzlich. Endpoints aendern sich noch nicht (das kommt H3).
REM
REM Naechster Schritt nach diesem Push: BAT 37 = Phase H3 — earn-Hooks
REM in bestehende Endpoints (PUT /me, POST /listings, /me/inquiries/:id/respond,
REM GET /me daily-login, Onboarding-Referral).
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

git commit -m "feat(coins): Phase H2 lib/coins.ts (earn/spend/sortier-helpers)"
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
echo  Phase H2 gepusht.
echo  Railway baut neu. lib/coins.ts wird mitkompiliert,
echo  aber noch nirgendwo aufgerufen — Build sollte sauber durchlaufen,
REM
echo  ohne dass sich am API-Verhalten was aendert.
echo.
echo  Verifikation:
echo    Railway -^> Logs -^> "Build successful"
echo    Endpoints reagieren noch wie vorher (H2 ist nur Library).
echo.
echo  Naechster Schritt: BAT 37 = Phase H3 (earn-Hooks).
echo ============================================================
echo.
pause
