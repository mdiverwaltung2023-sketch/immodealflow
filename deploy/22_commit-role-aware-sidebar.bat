@echo off
REM ============================================================
REM 22_commit-role-aware-sidebar.bat
REM
REM Phase F7 - Rolle-bewusste Sidebar:
REM
REM  A) SideNav rendert Sektionen je nach Rolle:
REM     - Reiner INVESTOR: Übersicht + "Als Investor" + Konto
REM     - Reiner SELLER:   Übersicht + "Als Verkäufer" + Konto
REM     - BEIDES:          alle 4 Sektionen
REM
REM  B) ViewModeToggle in der TopBar (Beides | Investor | Verkäufer):
REM     - Nur sichtbar bei Rolle BEIDES
REM     - Persistiert im localStorage (io-view-mode)
REM     - Cross-component-Sync per CustomEvent
REM     - Rolle-Badge daneben (Investor / Verkäufer / Beides)
REM
REM  C) Klarere Sektionsbeschriftungen:
REM     "Als Investor (kaufen)" / "Als Verkäufer (anbieten)"
REM
REM  Plus:
REM   - SidebarShell als Server-Component, fetched /me einmal,
REM     übergibt userRole an SideNav + TopBar
REM   - Layout-Refactor entsprechend
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

git commit -m "feat: rollenbewusste Sidebar + ViewMode-Toggle + klarere Sektionen"
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
echo.
echo  Was du nach dem Build siehst:
echo  - TopBar zentriert: Toggle "Beides | Investor | Verkäufer"
echo    (nur wenn deine Rolle BEIDES ist)
echo  - TopBar rechts: Rolle-Badge mit deiner Onboarding-Rolle
echo  - Sidebar: Sektionen "Als Investor (kaufen)" und
echo    "Als Verkäufer (anbieten)" je nach Modus/Rolle gefiltert
echo.
echo  Test: Toggle umschalten -^> Sidebar wechselt sofort,
echo  Reload -^> Modus bleibt erhalten (localStorage).
echo ============================================================
echo.
pause
