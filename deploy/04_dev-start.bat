@echo off
REM ============================================================
REM 04_dev-start.bat
REM Startet Backend (Port 4000) und Frontend (Port 3000)
REM gleichzeitig im Watch-Mode.
REM
REM Stoppen: Strg+C im geoeffneten Fenster.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.
echo Starte Backend (http://localhost:4000) und
echo         Frontend (http://localhost:3000) ...
echo.
echo Strg+C zum Beenden.
echo.

call npm run dev
pause
