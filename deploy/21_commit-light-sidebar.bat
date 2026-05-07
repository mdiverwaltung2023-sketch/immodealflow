@echo off
REM ============================================================
REM 21_commit-light-sidebar.bat
REM Phase F: Light-Theme + Sidebar-Layout (wie Infinity Nous)
REM   - Globals.css auf Light-Theme
REM   - SideNav + TopBar Komponenten
REM   - Layout-Refactor: Sidebar-Shell für SignedIn
REM   - Dashboard-Redesign mit Quick-Action-Tiles + KPIs +
REM     Marketplace-Listing-Kacheln
REM   - Alle Pages auf hellen Hintergrund umgestellt
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

git commit -m "feat: Light-Theme + Sidebar-Layout + Dashboard mit Inserate-Kacheln"
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
echo  - Linke Sidebar mit Sektionen (Uebersicht, Marktplatz,
echo    Meine Objekte, Konto)
echo  - Helles Theme, weisse Karten
echo  - Dashboard mit Quick-Action-Tiles + KPI-Kacheln +
echo    Marketplace-Inserate-Kacheln
echo ============================================================
echo.
pause
