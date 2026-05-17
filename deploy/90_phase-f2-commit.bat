@echo off
setlocal
chcp 850 >nul

REM ============================================================
REM 90_phase-f2-commit.bat
REM
REM Commit + Push fuer Phase F.2 + F.3 (Offmarket-Bilder).
REM ============================================================

cd /d "%~dp0\.."

echo.
echo === Projektordner: %CD% ===
echo Druecke eine Taste...
pause >nul
echo.

if exist ".git\index.lock" del /F /Q ".git\index.lock"

echo [1/3] Git-Status:
git status --short
echo.

echo [2/3] Add + Commit...
git add -A
git commit -m "feat(offmarket): Phase F.2 und F.3 - anonymisierte Bilder mit Blur und KI-Aquarell"
echo.

echo [3/3] Push...
git push origin main
if errorlevel 1 (
    echo FEHLER push.
    pause
    exit /b 1
)

echo.
echo === FERTIG ===
echo Railway baut neu, Vercel auch. In 2-3 Min teste:
echo   /offmarket/leads/[id]/edit  -- Bilder hochladen
echo   Blur-Variante in 5 Sek
echo   "Aquarell generieren" -- 15-30 Sek
echo   /offmarket-fuer-eigentuemer -- Demo-Karten
echo.
echo WICHTIG: in Railway den OPENAI_API_KEY setzen,
echo sonst gibt der Aquarell-Button 503.
echo.
pause
endlocal
