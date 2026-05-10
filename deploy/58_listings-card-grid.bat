@echo off
REM ============================================================
REM 58_listings-card-grid.bat
REM
REM "Meine Inserate"-Seite (/listings) optisch aufgewertet —
REM Bildkarten statt textlastiger Listenansicht.
REM
REM Aenderungen:
REM
REM   - frontend/components/OwnListingCard.tsx (neu, Client):
REM       Kompakte Verkaeufer-Sicht-Karte mit:
REM         - Bild-Cover (16:9), Carousel-Pfeile bei mehreren Bildern
REM         - Top-Left: Status-Pill (DRAFT/ACTIVE/IN_NEGOTIATION/SOLD/
REM           ARCHIVED in passenden Farben) + Asset-Typ-Badge
REM         - Top-Right: Bilder-Anzahl-Pill
REM         - Body: Preis + Preis/m², Lage, Titel,
REM           Kennzahlen-Grid (Flaeche, Miete, Rendite),
REM           "Bearbeiten"- und "Anfragen"-Buttons.
REM       Kein Verkaeufer-Name oder Rating (das ist Marketplace-
REM       Sicht, hier ist der User selbst der Verkaeufer).
REM
REM   - frontend/app/listings/page.tsx:
REM       Listenansicht durch Grid (2 Spalten md, 3 Spalten xl)
REM       ersetzt. Inserate werden sortiert: ACTIVE zuerst, dann
REM       IN_NEGOTIATION, DRAFT, SOLD, ARCHIVED — innerhalb gleicher
REM       Stufe nach updatedAt DESC.
REM       Status-Uebersicht-Card nach oben gezogen, Empty-State mit
REM       DemoSeedButton bekommt eigenes Frame.
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

git commit -m "feat(listings): Bilderkarten-Grid auf /listings (Verkaeufer-Sicht)"
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
echo  /listings zeigt jetzt eine Karten-Galerie mit Bildern,
echo  Status-Pills und direkten Aktions-Buttons.
echo ============================================================
echo.
pause
