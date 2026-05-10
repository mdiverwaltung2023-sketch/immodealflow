@echo off
REM ============================================================
REM 74_landing-l10-conversion-pages.bat
REM
REM Phase L10 — Conversion-orientierte Landing-Pages.
REM
REM ZWEI LANDING-PAGES
REM   /        - Investor-/Verkaeufer-LP mit Bietlimit-Rechner
REM              im Hero (lokal gerechnet, ohne Backend-Call).
REM   /mieten  - Mieter-LP mit Such-Hero, AGG-Pitch und
REM              Mieter-Profil-Teaser. Eingaben werden via
REM              ?redirect_url=... durch /sign-up an die
REM              /rental-marketplace-Page weitergegeben.
REM
REM AENDERUNG MIDDLEWARE
REM   frontend/middleware.ts:
REM     - "/mieten(.*)" als public route hinzugefuegt, sonst
REM       wuerde Clerk Anonyme zur sign-in-Seite umleiten.
REM
REM NEUE FRONTEND-DATEIEN
REM   frontend/app/(marketing)/lib/quickEstimate.ts
REM     - Lokale Schaetzformel: Stadt-Basiswert (Top-30 DACH-Staedte)
REM       x Asset-Typ-Faktor x Baujahr-Faktor x Wohnflaeche.
REM     - Liefert Marktwert, Bandbreite, Sollmiete, Mietmulti, Yield.
REM
REM   frontend/app/(marketing)/components/GeometricBackground.tsx
REM     - Abstrakter SVG-Hintergrund (Indigo-/Violett-Verlauf,
REM       konzentrische Kreise, Diagonal-Linien). Kein Foto.
REM
REM   frontend/app/(marketing)/components/HeroCalculator.tsx
REM     - Interaktiver Schaetz-Rechner. Client-Component.
REM     - Nach Klick "Schaetzung anzeigen" erscheint Stat-Grid +
REM       CTA "Vollanalyse mit Investor Club" -> /sign-up.
REM
REM   frontend/app/(marketing)/components/HeroTenantSearch.tsx
REM     - Mieter-Such-Hero. Eingaben (Stadt, Max-Miete, Min-Zimmer,
REM       moebliert, Haustiere) werden in Query-Params an
REM       /sign-up?redirect_url=/rental-marketplace?... uebergeben.
REM
REM   frontend/app/(marketing)/components/MarketingSections.tsx
REM     - Wiederverwendbar: TrustStrip, PillarsBlock, StepsBlock,
REM       PricingTeaser, MiniFaq, FooterCta, MarketingFooter,
REM       MarketingNav.
REM
REM   frontend/app/page.tsx (komplett neu)
REM     - Hero (links Headline + CTAs, rechts HeroCalculator)
REM     - TrustStrip
REM     - 3-Saeulen Investor / Verkaeufer / Mieter
REM     - 3-Schritte "So funktioniert's"
REM     - PricingTeaser (19 EUR/Mo, 190 EUR/Jahr)
REM     - MiniFaq (4 Fragen, outcome-orientiert)
REM     - FooterCta + MarketingFooter
REM
REM   frontend/app/mieten/page.tsx (neu)
REM     - Hero (links Headline + CTAs, rechts HeroTenantSearch)
REM     - TrustStrip (AGG / 1 Profil / Anonymisierung)
REM     - Vergleich Klassische Portale vs. Infinity Oikos
REM     - 3-Schritte
REM     - Mieter-Profil-Teaser (Cyan-Gradient)
REM     - MiniFaq (4 Mieter-spezifische Fragen)
REM     - FooterCta + MarketingFooter
REM
REM Eingeloggte User auf /        -> Redirect /dashboard
REM Eingeloggte User auf /mieten  -> Redirect /rental-marketplace
REM
REM Kein Backend-Aenderung, keine Migration. Reiner Frontend-Push.
REM npm install defensiv mitlaufen lassen.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

echo === Schritt 1: npm install (Lockfile-Sync) ===
echo.

call npm install
if errorlevel 1 (
    echo.
    echo FEHLER bei npm install. Pruefe Internet / Node-Version.
    pause
    exit /b 1
)

echo.
echo === Schritt 2: git ===
echo.

git status --short
echo.

git add -A
if errorlevel 1 (
    echo Fehler beim git add.
    pause
    exit /b 1
)

git commit -m "feat(landing): Phase L10 conversion-orientierte Landing-Pages mit Bietlimit-Rechner und Mieter-LP"
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
echo  Phase L10 gepusht. Vercel baut neu (^~2 Min).
echo
echo  Verifikation:
echo    1. /                  -^> neue Investor-LP mit Calculator.
echo       Stadt eingeben (z.B. Berlin), Asset-Typ ETW, 80 m^2,
echo       Baujahr 2010 -^> Schaetzung erscheint mit Marktwert,
echo       Bandbreite, Mietansatz, Multiplikator, Yield.
echo    2. /mieten           -^> Mieter-LP. Suche ausfuellen ->
echo       /sign-up mit redirect_url zur Mietboerse.
echo    3. Eingeloggter User auf /        -^> /dashboard Redirect.
echo    4. Eingeloggter User auf /mieten  -^> /rental-marketplace.
echo    5. MarketingNav: Klick "Fuer Mieter" springt zu /mieten.
echo
echo  Wenn Calculator nicht aufploppt: Browser-Cache leeren.
echo ============================================================
echo.
pause
