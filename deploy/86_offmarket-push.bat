@echo off
setlocal
chcp 65001 >nul

REM ============================================================
REM 86_offmarket-push.bat  (Ersatz fuer 85, ohne Umlaute/Bindestriche)
REM ============================================================

cd /d "%~dp0\.."

echo.
echo === Projektordner: %CD% ===
echo Druecke eine Taste um zu starten...
pause >nul
echo.

REM --- Schritt 1: Lock-Datei aufraeumen ---
if exist ".git\index.lock" (
    echo [1/4] Lock-Datei vorhanden, loesche...
    del /F /Q ".git\index.lock"
    if exist ".git\index.lock" (
        echo FEHLER: Lock-Datei konnte nicht geloescht werden.
        echo Schliesse GitHub Desktop / VS Code Git-Panel / SourceTree
        echo und starte diese BAT erneut.
        pause
        exit /b 1
    )
    echo Lock entfernt.
) else (
    echo [1/4] Keine Lock-Datei vorhanden.
)
echo.

REM --- Schritt 2: Git-Status anzeigen ---
echo [2/4] Git-Status:
git status --short
echo.

REM --- Schritt 3: Add + Commit ---
echo [3/4] Stage alle Aenderungen...
git add -A
if errorlevel 1 (
    echo FEHLER: git add fehlgeschlagen.
    pause
    exit /b 1
)

echo Commit...
git commit -m "feat(offmarket): Phase F Offmarket-Layer (Reverse-Marketplace, Finanzierungs-Spotlight, Chat, Akquise-Landing)"
if errorlevel 1 (
    echo HINWEIS: commit hat status != 0. Wenn "nothing to commit" stand,
    echo ist alles schon gespeichert.
)
echo.

REM --- Schritt 4: Push ---
echo [4/4] Push nach main...
git push origin main
if errorlevel 1 (
    echo FEHLER: git push fehlgeschlagen.
    echo Pruefe Internet + GitHub-Login.
    pause
    exit /b 1
)

echo.
echo === FERTIG ===
echo Push erledigt. Railway + Vercel deployen automatisch in 1-2 Minuten.
echo.
echo Teste danach:
echo   Health   https://dealflow-ai-backend-production.up.railway.app/health
echo   Stats    https://dealflow-ai-backend-production.up.railway.app/offmarket/stats
echo   App      https://immodealflow-frontend.vercel.app/offmarket
echo   Landing  https://immodealflow-frontend.vercel.app/offmarket-fuer-eigentuemer
echo.
pause
endlocal
