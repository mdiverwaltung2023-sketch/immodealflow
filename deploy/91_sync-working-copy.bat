@echo off
setlocal
chcp 850 >nul

REM ============================================================
REM 91_sync-working-copy.bat
REM
REM Setzt die lokale Working Copy zurueck auf den Stand vom
REM letzten gepushten Commit (HEAD). Damit ist alles, was Marco
REM lokal sieht, identisch mit dem was Railway/Vercel deployt.
REM
REM HINWEIS: Verwirft alle nicht-committeten lokalen Aenderungen.
REM ============================================================

cd /d "%~dp0\.."

echo.
echo === Projektordner: %CD% ===
echo.
echo Aktueller HEAD:
git log --oneline -1
echo.
echo Aenderungen seit HEAD (diese werden verworfen):
git diff HEAD --stat
echo.
echo Druecke ENTER, um working copy auf HEAD zurueckzusetzen.
echo Schliesse das Fenster, wenn du das NICHT willst.
pause >nul

echo.
echo Reset...
git reset --hard HEAD
if errorlevel 1 (
    echo FEHLER bei reset.
    pause
    exit /b 1
)

echo.
echo === Status nach Reset ===
git status --short
echo.
echo Working copy ist jetzt synchron mit HEAD.
pause
endlocal
