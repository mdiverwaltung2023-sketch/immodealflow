@echo off
REM ============================================================
REM 53_sale-process-j5-dashboard.bat
REM
REM Phase J5 — Dashboard rollen-/viewMode-abhaengig.
REM
REM Backend (backend/src/index.ts):
REM   - Neuer Endpoint GET /me/inquiries-received  ?status=PENDING
REM     Liefert alle Anfragen auf eigenen Listings (mit Listing-Mini
REM     und Investor-Mini), aggregiert ueber alle eigenen Inserate.
REM
REM Frontend:
REM   - lib/api.ts: PropertyListItemT als Type-Export ergaenzt;
REM     InquiryReceivedSchema neu (fuer /me/inquiries-received).
REM
REM   - app/dashboard/InvestorView.tsx (neu, "use client"):
REM     bisherige Investor-Sicht extrahiert — Pipeline-Wert (Watchlist),
REM     ZVG-Quick-Action, NEGOTIATING/LOI/NOTAR/CLOSED-Counts,
REM     Marketplace-Tiles.
REM
REM   - app/dashboard/SellerView.tsx (neu, "use client"):
REM     Verkaeufer-Sicht — Pipeline-Wert aus Verkaufsprozessen
REM     (agreedPrice oder askingPrice), aktive Inserate / Drafts /
REM     IN_NEGOTIATION / SOLD, offene PENDING-Anfragen, Stages-
REM     Verteilung der laufenden Verkaeufe, eigene Inserate als
REM     Mini-Tiles. Quick-Actions: Inserat anlegen, Meine Inserate,
REM     Verkaufsabwicklung, Offene Anfragen.
REM
REM   - app/dashboard/DashboardSwitcher.tsx (neu, "use client"):
REM     Liest viewMode aus localStorage + hoert auf VIEW_MODE_EVENT.
REM     Rendert SellerView, wenn role=SELLER ODER (role=BOTH/BROKER
REM     und viewMode=SELLER). Default Investor-View.
REM
REM   - app/dashboard/page.tsx (Server Component): laedt parallel
REM     properties, myListings, marketplace, sale-processes,
REM     inquiries-received. Header zeigt rollenabhaengigen
REM     Untertext. Uebergibt alles an Switcher.
REM
REM Hinweis: Der ZVG-Tile + Watchlist-Pipeline-Wert verschwinden in
REM Verkaeufer-Sicht. Bei Rolle BOTH/BROKER kann der User ueber den
REM Sidebar-Toggle (TopBar bei BOTH) zwischen den Sichten wechseln.
REM
REM Keine neuen Dependencies, kein npm install noetig.
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

git commit -m "feat(sales): Phase J5 Dashboard rollenabhaengig (Investor- vs Verkaeufer-Sicht)"
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
echo  Phase J5 gepusht — letzte Phase der Verkaeufer-UX-Serie.
echo  Vercel + Railway bauen neu (^~2 Min).
echo
echo  Smoke-Test in der App:
echo    1) Rolle SELLER:  Dashboard zeigt automatisch Verkaeufer-
echo       Sicht — keine ZVG-Tile, kein Pipeline-Wert aus Watchlist.
echo    2) Rolle BOTH:  Dashboard zeigt Investor-Sicht (Default).
echo       Sidebar-Toggle auf "Verkaeufer" -^> Dashboard wechselt
echo       sofort auf Verkaeufer-Sicht.
echo    3) Verkaeufer-Sicht: Pipeline-Wert (aus Sale-Prozessen),
echo       Stage-Verteilung, offene PENDING-Anfragen, eigene
echo       Inserate als Tiles.
echo
echo  Phase J ist damit komplett (J1-J5). Verkaeufer-UX rund.
echo ============================================================
echo.
pause
