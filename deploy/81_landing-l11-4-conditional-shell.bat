@echo off
REM ============================================================
REM 81_landing-l11-4-conditional-shell.bat
REM
REM Phase L11.4 — Marketing-Pages ohne App-Shell.
REM
REM PROBLEM
REM   Eingeloggte User auf /, /mieten, /verkaufen sahen DOPPELTE
REM   Navigation: Sidebar links + TopBar mit Rollen-Toggle PLUS
REM   die MarketingNav, die zur Landing-Page gehoert.
REM
REM LOESUNG
REM   Marketing-Pages rendern jetzt IMMER ohne App-Shell —
REM   eingeloggt oder nicht. Das ist konzeptionell sauberer:
REM   die Landing-Pages sind oeffentliche Conversion-Raeume und
REM   sollten fuer alle gleich aussehen.
REM
REM AENDERUNGEN
REM   frontend/components/ConditionalShell.tsx (neu):
REM     - Client-Component, liest usePathname().
REM     - Liefert je nach Pfad entweder marketingChildren (nackt)
REM       oder defaultChildren (mit SidebarShell fuer SignedIn,
REM       nackt fuer SignedOut).
REM     - Marketing-Pfade: "/", "/mieten/*", "/verkaufen/*"
REM
REM   frontend/app/layout.tsx:
REM     - Import von ConditionalShell.
REM     - SignedIn/SignedOut + SidebarShell-Wrapper sind jetzt im
REM       defaultChildren-Slot.
REM     - Marketing-Pages bekommen children direkt durchgereicht.
REM     - Metadata-Title auf neue Positionierung umgestellt
REM       ("KI-gestuetzte Investmentplattform").
REM
REM Eingeloggter User auf /verkaufen sieht jetzt:
REM   - MarketingNav oben (Logo + Verkaufen?/Mieter/Tarife/
REM     Anmelden/Kostenlos starten)
REM   - Volle Hero-Breite mit Wizard
REM   - KEINE Sidebar links, keine TopBar
REM
REM Eingeloggter User auf /dashboard, /listings, /admin/* etc.
REM sieht weiterhin die volle App-Shell wie bisher.
REM
REM Kein Backend, keine Migration. Reiner Frontend-Push.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

call npm install
if errorlevel 1 (
    echo.
    echo FEHLER bei npm install. Pruefe Internet / Node-Version.
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

git commit -m "feat(layout): Phase L11.4 Marketing-Pages ohne App-Shell rendern"
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
echo  Phase L11.4 gepusht. Vercel baut neu (^~2 Min).
echo
echo  Verifikation:
echo    1. Eingeloggt /verkaufen aufrufen.
echo       -^> Keine Sidebar mehr links, keine App-TopBar.
echo       -^> Nur MarketingNav oben + voller Hero mit Wizard.
echo    2. /mieten und / (Investor-LP) genauso.
echo    3. /dashboard aufrufen — App-Shell ist weiter da (Sidebar
echo       links, TopBar oben).
echo    4. /admin/broker-leads — App-Shell mit Lead-Liste.
echo    5. /pricing — bleibt App-Shell (ist Account-bezogen).
echo
echo  Falls Layout-Fehler: Hard-Reload (Strg+F5).
echo ============================================================
echo.
pause
