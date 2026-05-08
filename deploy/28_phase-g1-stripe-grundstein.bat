@echo off
REM ============================================================
REM 28_phase-g1-stripe-grundstein.bat
REM
REM Phase G1 - Stripe-Subscription-Grundstein:
REM
REM   Schema:
REM     +Enum UserPlan (FREE, INVESTOR_PRO, SELLER_PRO)
REM     +User.plan (default FREE)
REM     +User.planValidUntil (DateTime?)
REM     +User.stripeCustomerId (unique)
REM     +User.stripeSubscriptionId (unique)
REM     +Migration-File 20260508070000_user_plan_stripe
REM
REM   Backend (backend/src/index.ts):
REM     +stripe Dependency in package.json
REM     +Stripe-Client (lazy, optional, 503 wenn nicht configured)
REM     +POST /webhooks/stripe (raw body, Signatur-Validation)
REM     +GET  /me/billing (aktueller Plan + Stripe-Ready-Status)
REM     +POST /me/billing/checkout (startet Checkout-Session)
REM     +POST /me/billing/portal (oeffnet Customer-Portal)
REM     +Event-Handler fuer:
REM        - checkout.session.completed
REM        - customer.subscription.created/updated
REM        - customer.subscription.deleted
REM
REM   Doku:
REM     +deploy/STRIPE-SETUP.md (Schritt-fuer-Schritt-Anleitung
REM      Stripe-Dashboard + Railway-ENV-Vars)
REM
REM ============================================================
REM
REM  WAS DU NACH DEM PUSH MACHEN MUSST (siehe STRIPE-SETUP.md):
REM   1) Stripe-Dashboard:
REM      - Products + Prices anlegen (Investor Pro, Verkaeufer Pro)
REM      - Customer Portal aktivieren
REM      - Webhook-Endpoint registrieren
REM        URL: https://api.infinityoikos.com/webhooks/stripe
REM        Events: checkout.session.completed,
REM                customer.subscription.created/updated/deleted
REM   2) Railway ENV-Variablen:
REM      STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
REM      STRIPE_PRICE_INVESTOR_MONTHLY, STRIPE_PRICE_INVESTOR_YEARLY,
REM      STRIPE_PRICE_SELLER_MONTHLY, STRIPE_PRICE_SELLER_YEARLY
REM   3) Smoke-Test mit Test-Karte 4242 4242 4242 4242
REM
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

git commit -m "feat: Phase G1 Stripe-Grundstein (Schema, Webhook, Checkout, Portal)"
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
echo  Phase G1 gepusht. Railway:
echo    1) npm install (zieht stripe-Dependency)
echo    2) tsc Build (~30s)
echo    3) prisma migrate deploy (legt UserPlan + User-Spalten an)
echo    4) Backend startet
echo.
echo  Sobald das durch ist:
echo    - Stripe-Dashboard einrichten (siehe STRIPE-SETUP.md)
echo    - Railway-ENV setzen (siehe STRIPE-SETUP.md)
echo    - Smoke-Test:
echo        GET  /me/billing  -^> { plan: "FREE", stripeReady: true }
echo        POST /me/billing/checkout -^> Checkout-URL
echo.
echo  Frontend (Pricing-Page, Upgrade-CTAs) kommt in Phase G2.
echo ============================================================
echo.
pause
