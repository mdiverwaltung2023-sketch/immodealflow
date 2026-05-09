@echo off
REM ============================================================
REM 41_coin-system-h7-referral.bat
REM
REM Phase H7 — Coin-System: Referral-Link.
REM
REM Aenderungen:
REM   - frontend/components/ReferralCapture.tsx (neu, Client-Component):
REM       Liest beim Mount ?ref=<userId> aus URL und persistiert in
REM       localStorage (Key oikos_ref + Zeitstempel, TTL 30 Tage).
REM       Exportiert readStoredReferral() / clearStoredReferral().
REM
REM   - frontend/app/layout.tsx:
REM       <ReferralCapture/> direkt vor SignedIn/SignedOut gemountet,
REM       damit jeder Pfad (Landing, Sign-up, Sign-in, Onboarding)
REM       den Wert auffaengt.
REM
REM   - frontend/app/onboarding/OnboardingForm.tsx:
REM       liest beim Mount readStoredReferral(), schickt referredById
REM       an /me/complete-onboarding mit, loescht Key bei Erfolg.
REM       Zeigt einen Hinweis-Banner "Empfehlung erkannt".
REM       Roles erweitert um BROKER mit Beschreibung.
REM
REM   - frontend/app/coins/ReferralLinkCard.tsx (neu, Client-Component):
REM       Card "Lade Makler ein" mit dem persoenlichen Werbe-Link
REM       sign-up?ref=<userId> + Copy-Button + Anzeige der bereits
REM       belohnten Referrals + Reward-Berechnung (Early-Bird-Multiplier).
REM
REM   - frontend/app/coins/page.tsx:
REM       Referenz-Card zwischen Spend-Options und Earn-Tabelle.
REM       referralCount aus tx-history aggregiert (kind = REFERRAL_BROKER_ONBOARDED).
REM
REM Anti-Farming-Logik laeuft im Backend (Phase H3): tryTriggerReferral
REM prueft Profile-Threshold + ACTIVE-Listing, bevor der Werber 100 Coins
REM bekommt. Dies BAT enthaelt nur die UI dazu.
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

git commit -m "feat(coins): Phase H7 Referral-Link (Capture + OnboardingForm + ReferralLinkCard)"
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
echo  Phase H7 gepusht.
echo  Vercel baut neu.
echo.
echo  Smoke-Test:
echo    1) /coins -^> Referral-Card sichtbar mit deinem Link.
echo       Kopieren -^> in einem Inkognito-Fenster oeffnen.
echo    2) Inkognito sign-up?ref=^<deine-id^> -^> Onboarding zeigt
echo       "Empfehlung erkannt"-Banner.
echo    3) Neuer User durchlaeuft Onboarding, fuellt Profil aus,
echo       aktiviert ein Inserat -^> du bekommst +100 Coins
echo       (oder +150 Early-Bird) im /coins-Verlauf.
echo.
echo  Naechster Schritt: BAT 42 = Phase H8 (Admin-Dashboard /admin/coins
echo    mit den 3 Tabs).
echo ============================================================
echo.
pause
