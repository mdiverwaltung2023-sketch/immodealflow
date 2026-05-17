@echo off
REM ============================================================
REM 84_commit-phase-f-offmarket.bat
REM
REM Phase F (Offmarket-Layer) committen + pushen.
REM Reihenfolge:
REM   1) Lokal Schema-Migration ausfuehren (83_phase-f1-offmarket-schema.bat)
REM      muss VORHER gelaufen sein, sonst bricht Backend-Start ab.
REM   2) Git add + commit + push.
REM   3) Railway + Vercel deployen automatisch beim Push auf main.
REM
REM Nach Push:
REM   - Health-Check: https://dealflow-ai-backend-production.up.railway.app/health
REM   - Stats-Probe:  https://dealflow-ai-backend-production.up.railway.app/offmarket/stats
REM   - Live-Test:    https://immodealflow-frontend.vercel.app/offmarket
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

git status --short
echo.

echo === Stage alle Aenderungen ===
git add -A
if errorlevel 1 (
    echo FEHLER: git add fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo === Commit ===
git commit -m "feat(offmarket): Phase F — Offmarket-Layer mit Reverse-Marketplace, Finanzierungs-Spotlight, 1:1-Chat und Akquise-Landing" -m "- Neue Prisma-Models: OffmarketLead, OffmarketInvite, OffmarketMessage" -m "- Backend: 16 neue Endpoints (Lead-CRUD, Match-Engine, Invite, Chat, Discovery, Stats)" -m "- Frontend: /offmarket Hub + Wizard + Lead-Detail + Investoren-Discovery + Posteingang + 1:1-Chat" -m "- Sidebar: neue Offmarket-Sektion (gold) parallel zu bestehenden Sections" -m "- Public Akquise-Landing /offmarket-fuer-eigentuemer fuer eBay-Verkaeufer-Gespraeche" -m "- Bestehendes Marketplace/Listing/Inquiry bleibt 1:1 unveraendert"
if errorlevel 1 (
    echo.
    echo HINWEIS: git commit hat einen Status != 0 geliefert.
    echo Wenn 'nothing to commit' angezeigt wurde, ist das OK.
    echo Sonst pruefe die Fehlermeldung.
)

echo.
echo === Push nach main ===
git push origin main
if errorlevel 1 (
    echo FEHLER: git push fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo === Erfolg ===
echo Push abgeschlossen. Railway + Vercel deployen automatisch.
echo Warte 1-2 Minuten, dann teste:
echo   - Health:   https://dealflow-ai-backend-production.up.railway.app/health
echo   - Stats:    https://dealflow-ai-backend-production.up.railway.app/offmarket/stats
echo   - App:      https://immodealflow-frontend.vercel.app/offmarket
echo   - Landing:  https://immodealflow-frontend.vercel.app/offmarket-fuer-eigentuemer
echo.
pause
