@echo off
REM ============================================================
REM 45_logo-image-based.bat
REM
REM Logo-Variante 2 — Bild-basiert statt SVG-Nachzeichnung.
REM
REM Was passiert:
REM   - Bild wird (falls noch nicht da) von Bilder/ in
REM     frontend/public/infinity-logo.jpg kopiert
REM   - frontend/components/BrandLogo.tsx zeigt das Original-Bild
REM     mit CSS-Crop (oben 70 %, EIDOS-Teil wird ausgeblendet)
REM   - "OIKOS" wird als HTML-Text darunter gerendert (Goldverlauf)
REM   - SideNav, TopBar, AuthHero auf neue API umgestellt
REM
REM Vorausgesetzt: das Bild liegt unter
REM   frontend/public/infinity-logo.jpg
REM
REM Falls noch nicht: BAT kopiert es automatisch aus dem Bilder/-Ordner.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

REM Public-Ordner anlegen falls noetig
if not exist "frontend\public" (
    echo Lege Ordner frontend\public an...
    mkdir "frontend\public"
)

REM Bild kopieren falls es im Public-Ordner fehlt
if not exist "frontend\public\infinity-logo.jpg" (
    echo Kopiere Logo-Bild nach frontend\public\infinity-logo.jpg ...
    copy "Bilder\WhatsApp Image 2026-04-16 at 17.49.58 (1).jpeg" "frontend\public\infinity-logo.jpg" >nul
    if errorlevel 1 (
        echo.
        echo FEHLER: Bild "WhatsApp Image 2026-04-16 at 17.49.58 (1).jpeg"
        echo nicht im Bilder-Ordner gefunden. Bitte manuell kopieren.
        pause
        exit /b 1
    )
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

git commit -m "feat(brand): Original-Logo per CSS-Crop (EIDOS abgeschnitten) + OIKOS extern"
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
echo  Logo-Update gepusht.
echo  Vercel baut neu (^~1-2 Min).
echo.
echo  Sobald gruen: oben in der Sidebar siehst du das Original-
echo  Logo (Symbol + INFINITY) und darunter "OIKOS" in goldenem
echo  Schriftzug.
echo
echo  Falls du den Ausschnitt-Anteil aendern willst:
echo  in BrandLogo.tsx die Konstante VISIBLE_FRACTION (aktuell 0.7)
echo  anpassen — kleiner = mehr abgeschnitten, groesser = weniger.
echo ============================================================
echo.
pause
