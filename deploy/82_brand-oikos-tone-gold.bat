@echo off
REM ============================================================
REM 82_brand-oikos-tone-gold.bat
REM
REM OIKOS-Schriftzug deutlicher auf dunklem Hintergrund.
REM
REM PROBLEM
REM   Im AuthHero (Sign-in/Sign-up und Landing-Page-Variante)
REM   wurde "OIKOS" mit Indigo-Verlauf auf dunkelblauen Hintergrund
REM   gerendert -^> kaum lesbar.
REM
REM LOESUNG
REM   BrandWordmark + BrandLockup bekommen einen tone-Prop:
REM     - "indigo" (default): wie bisher, fuer helle Hintergruende
REM     - "gold": warmer Goldverlauf (amber-200 -^> yellow-400 -^>
REM       amber-500) plus subtiler Drop-Shadow.
REM   Passt zum goldenen INFINITY-Symbol im Logo-Bild und ist auf
REM   dunkelblau / indigo-Gradients klar lesbar.
REM
REM AENDERUNGEN
REM   frontend/components/BrandLogo.tsx:
REM     - BrandWordmark: tone-Prop "indigo" | "gold".
REM     - BrandLockup: tone-Prop reicht durch zum Wordmark.
REM
REM   frontend/components/AuthHero.tsx:
REM     - BrandLockup nutzt jetzt tone="gold" (vorher
REM       className="text-white" — was den bg-clip-Gradient
REM       nicht ueberschreibt).
REM
REM Sidebar (SideNav) und TopBar bleiben unveraendert (Indigo-
REM Variante auf weissem Hintergrund — passt weiter).
REM
REM Reiner Frontend-Cosmetic-Push.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

call npm install
if errorlevel 1 (
    echo.
    echo FEHLER bei npm install.
    pause
    exit /b 1
)

echo.
echo === git ===
echo.

git status --short
echo.

git add -A
if errorlevel 1 (
    echo Fehler beim git add.
    pause
    exit /b 1
)

git commit -m "style(brand): OIKOS-Wordmark mit Gold-Tone auf dunklem AuthHero"
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
echo  Push gemacht. Vercel baut neu (^~2 Min).
echo
echo  Verifikation:
echo    1. /sign-in oder /sign-up oeffnen.
echo    2. OIKOS unter dem INFINITY-Logo ist jetzt klar in Gold,
echo       passt zum goldenen Symbol darueber, gut lesbar auf
echo       dem dunkelblauen Hintergrund.
echo    3. Sidebar (eingeloggt) zeigt OIKOS weiter in Indigo —
echo       passt zum weissen Sidebar-Hintergrund.
echo ============================================================
echo.
pause
