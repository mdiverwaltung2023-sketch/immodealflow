@echo off
REM ============================================================
REM 52_sale-process-j4-offmarket.bat
REM
REM Phase J4 — Off-Market-Verkauf direkt von der Listing-Edit-Page
REM aus starten (ohne dass jemand ueber den Marketplace anfragen muss).
REM
REM Aenderungen:
REM
REM Backend (backend/src/index.ts):
REM   - GET /me/sale-processes ?listingId= — neuer Filter, damit
REM     das Frontend pruefen kann, ob es fuer ein Listing schon einen
REM     aktiven Prozess gibt.
REM
REM Frontend:
REM   - frontend/app/listings/[id]/edit/StartSaleProcessButton.tsx (neu):
REM       - Holt /me/sale-processes?listingId=...
REM       - Wenn aktiver Prozess existiert: zeigt Status + "Verkauf
REM         oeffnen"-Button (Direkt-Link zu /sales/<id>)
REM       - Sonst: Card "Verkaufsabwicklung" mit Modal-Trigger
REM         "Off-Market-Verkauf starten" (optional Kaufpreis + Notiz)
REM       - Nach Start -^> router.push zu /sales/<id>
REM
REM   - frontend/app/listings/[id]/edit/page.tsx:
REM       - Importiert + rendert StartSaleProcessButton unter
REM         CoinHighlightButton, ueber dem Felder-Editor.
REM
REM Hinweis: buyerId wird in V1 bewusst leer gelassen — Marco kann
REM den Kaeufer-Namen in der Notiz vermerken. V2 koennte ein
REM Buyer-Lookup oder Email-Invite ergaenzen.
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

git commit -m "feat(sales): Phase J4 Off-Market-Trigger auf Listing-Edit + listingId-Filter im Backend"
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
echo  Phase J4 gepusht.
echo  Vercel + Railway bauen neu (^~2 Min).
echo
echo  Smoke-Test in der App:
echo    1) /listings/^<id^>/edit auf einem Inserat ohne aktiven
echo       Verkauf  -^> "Off-Market-Verkauf starten"-Card sichtbar.
echo    2) Klick -^> Modal mit Preis + Notiz -^> Verkauf starten
echo       -^> Browser leitet auf /sales/^<id^> weiter.
echo    3) Wieder auf /listings/^<id^>/edit  -^> die Card zeigt
echo       jetzt "Verkaufsabwicklung laeuft" + Direkt-Link.
echo
echo  Naechster Schritt: BAT 53 = Phase J5 (Dashboard rollenabhaengig
echo    — Verkaeufer sieht eigene Pipeline-KPIs statt Investor-
echo    Watchlist und ZVG).
echo ============================================================
echo.
pause
