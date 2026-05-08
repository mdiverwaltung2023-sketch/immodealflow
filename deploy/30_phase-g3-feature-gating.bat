@echo off
REM ============================================================
REM 30_phase-g3-feature-gating.bat
REM
REM Phase G3 - Feature-Gating: Backend setzt jetzt die Plan-Limits
REM durch, das Frontend zeigt freundliche Pay-Walls statt 500.
REM
REM   Backend (backend/src/lib/billing.ts neu):
REM     - PlanLimits-Tabelle:
REM         FREE          -> 1 active Listing, 3 Inquiries/30d,
REM                          kein Off-Market
REM         INVESTOR_PRO  -> Off-Market, unlimited Inquiries
REM         SELLER_PRO    -> 10 active Listings, Verifiziert-Badge
REM     - Helper: getPlanLimits, countActiveListings,
REM       countInquiriesLast30d, paywallBody (strukturierter
REM       402-Body { reason, message, upgradeTo, current, limit })
REM
REM   Backend Endpoints (Limits durchgesetzt):
REM     - GET  /marketplace?offMarket=true  -> 402 wenn nicht Pro
REM     - POST /me/inquiries                 -> 402 bei 3+/30d Free
REM     - PATCH /me/listings/:id status=ACTIVE -> 402 ueber Limit
REM
REM   Frontend Pay-Wall:
REM     - Marketplace-Page strippt offMarket-Filter fuer Free-User
REM       und zeigt Hint-Banner ueberhalb der Ergebnisse statt
REM       eine SSR-Crash-Seite zu produzieren
REM     - InquiryActions: 402 wird abgefangen, freundlicher
REM       Pay-Wall-Block mit "Investor Pro freischalten"
REM     - ListingEditor: 402 wird abgefangen, Pay-Wall-Block
REM       mit "Verkaeufer Pro freischalten" + Tipp zum Entwurfs-
REM       Modus
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

git commit -m "feat: Phase G3 Feature-Gating (Backend-Limits + Frontend-Paywalls)"
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
echo  Phase G3 gepusht. Vercel + Railway bauen automatisch.
echo.
echo  Smoke-Test nach dem Build:
echo    1) Als Free-User /marketplace mit offMarket=true in URL
echo       -^> Page laedt mit Pro-Hint-Banner, regulaere Ergebnisse
echo    2) Als Free-User 4. Anfrage stellen
echo       -^> Pay-Wall-Block in InquiryActions
echo    3) Als Free-User 2. Listing auf ACTIVE setzen
echo       -^> Pay-Wall-Block im ListingEditor
echo    4) Mit Stripe-Test-Karte 4242... auf Pro upgraden
echo       -^> alle drei Sperren entfallen
echo.
echo  Tipp: Plan eines Test-Users laesst sich per SQL anpassen,
echo  bis Stripe-Setup live ist:
echo    UPDATE "User" SET plan='INVESTOR_PRO' WHERE email='...';
echo ============================================================
echo.
pause
