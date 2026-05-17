@echo off
REM ============================================================
REM 85_hotfix-git-lock.bat
REM
REM Entfernt eine zurueckgebliebene .git/index.lock und versucht
REM danach den Phase-F-Commit + Push erneut.
REM
REM Hintergrund: Wenn ein Git-Prozess vorher abgebrochen wurde
REM (Editor zu, BAT-Fenster X-Klick, ...), bleibt die Lock-Datei
REM liegen und blockiert alle weiteren Git-Operationen mit:
REM   fatal: Unable to create '.../.git/index.lock': File exists
REM Diese Lock manuell loeschen ist absolut sicher, solange kein
REM anderer Git-Prozess wirklich laeuft.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

if exist .git\index.lock (
    echo Gefundene Lock-Datei: .git\index.lock
    echo Entferne sie...
    del /F /Q .git\index.lock
    if exist .git\index.lock (
        echo FEHLER: Konnte Lock-Datei nicht loeschen.
        echo Pruefe ob ein Git-Programm (GitHub Desktop, SourceTree,
        echo VS Code-Git-Panel) im Hintergrund offen ist und schliesse es.
        pause
        exit /b 1
    )
    echo Lock entfernt.
) else (
    echo Keine Lock-Datei vorhanden — Lock war evtl. schon weg.
)

echo.
echo === Git-Status nach Aufraeumen ===
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
    echo Wenn 'nothing to commit, working tree clean' angezeigt wurde,
    echo war alles schon committet — dann ist das OK.
)

echo.
echo === Push nach main ===
git push origin main
if errorlevel 1 (
    echo FEHLER: git push fehlgeschlagen.
    echo Pruefe Internet-Verbindung und GitHub-Credentials.
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
