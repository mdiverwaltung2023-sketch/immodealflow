@echo off
REM ============================================================
REM 48_messaging-investoren-verkaeufer.bat
REM
REM Marken-Botschaft umformuliert: weg von "MFH und Gewerbe"
REM hin zu "Investoren und Verkäufer". Engt den Kundenkreis
REM nicht mehr auf Asset-Klassen ein.
REM
REM Geaenderte Stellen:
REM   - app/page.tsx              Landing-Headline
REM     "Marketplace für MFH / und Gewerbe."
REM     -^> "Marketplace für / Investoren und Verkäufer."
REM
REM   - components/AuthHero.tsx   Sign-In/Landing-Footer
REM     "Marketplace für MFH und Gewerbe"
REM     -^> "Marketplace für Investoren und Verkäufer"
REM
REM   - components/SidebarShell.tsx App-Footer (eingeloggt)
REM     dito
REM
REM   - app/dashboard/page.tsx    Begruessung-Untertext
REM     dito (mit Anhaengsel "Verkaeufer sehen dein Investor-Profil.")
REM
REM   - app/dashboard/page.tsx    Quick-Action-Tile-Subtitle
REM     "MFH oder Gewerbe inserieren" -^> "Immobilie inserieren"
REM
REM   - app/marketplace/MarketplaceHero.tsx  Hero-Headline
REM     "MFH und Gewerbe finden, die zu deinem Profil passen."
REM     -^> "Immobilien finden, die zu deinem Profil passen."
REM
REM   - app/layout.tsx            Browser-Tab-Title / SEO
REM     "Infinity Oikos — Marketplace für MFH und Gewerbe"
REM     -^> "Infinity Oikos — Marketplace für Investoren und Verkäufer"
REM
REM   - app/onboarding/OnboardingForm.tsx  Investor-Beschreibung
REM     "Du analysierst Objekte, kaufst MFH/Gewerbe und willst..."
REM     -^> "Du analysierst Objekte, kaufst Immobilien und willst..."
REM
REM Inserat-Detail-Felder (Wohneinheiten, Gewerbeeinheiten, etc.)
REM bleiben unangetastet — die brauchen Verkaeufer als konkrete
REM Strukturierung pro Asset.
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

git commit -m "copy: Messaging von 'MFH und Gewerbe' auf 'Investoren und Verkaeufer'"
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
echo  Gepusht. Vercel baut neu (^~1-2 Min).
echo  Kundenkreis nicht mehr auf MFH/Gewerbe limitiert.
echo ============================================================
echo.
pause
