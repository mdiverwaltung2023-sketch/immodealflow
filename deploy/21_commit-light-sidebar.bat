@echo off
REM ============================================================
REM 21_commit-light-sidebar.bat
REM Phase F: Light-Theme + Sidebar + Marketplace-Ausbau
REM
REM Beinhaltet:
REM  F1 - Light-Theme (globals.css, ui.tsx)
REM  F2 - Sidebar-Shell (SideNav, TopBar, Layout-Refactor)
REM  F3 - Dashboard mit Quick-Actions, KPIs, Inserate-Kacheln
REM  F4 - Marketplace im Immoscout-Stil:
REM       * Hero-Suchblock mit Indigo-Gradient + Quick-Presets
REM       * Sidebar-Filter links (Asset-Typ-Chips, Preisspanne)
REM       * Sortier-Toolbar (Preis aufst./abst./Rendite/...)
REM       * ListingCard mit Bilder-Carousel, Save-Heart,
REM         NEW-Badge, Kennzahlen-Reihe (m2, Miete, Rendite)
REM  F5 - Marketplace-Detail upgraded:
REM       * Bilder-Galerie (Hauptbild + Thumbs + Lightbox)
REM       * Sticky-Sidebar mit Verkaeufer-Card + CTA + Kennzahlen
REM       * Eckdaten-Strip mit Icon-Stats
REM       * Breadcrumb-Navigation
REM  F6 - Restliche Pages auf Light-Theme angepasst
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

git commit -m "feat: Light-Theme + Sidebar + Marketplace im Immoscout-Stil"
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
echo  Commit + Push erfolgreich.
echo  Vercel baut Frontend automatisch (1-2 Minuten).
echo  Railway-Backend ist nicht betroffen.
echo.
echo  Nach dem Build pruefen:
echo    https://infinityoikos.com/dashboard
echo      - Sidebar links + helles Theme
echo      - Quick-Action-Tiles + KPIs + Inserate-Kacheln
echo    https://infinityoikos.com/marketplace
echo      - Hero-Suchblock mit Quick-Presets
echo      - Filter-Sidebar links + Sortier-Dropdown
echo      - Reichere Kacheln mit Carousel + Heart + Rendite
echo    https://infinityoikos.com/marketplace/<id>
echo      - Bilder-Galerie mit Lightbox
echo      - Sticky-Sidebar mit Anfrage-CTA + Verkaeufer
echo      - Eckdaten-Strip + Section-Layout
echo ============================================================
echo.
pause
