@echo off
REM ============================================================
REM dev.bat  --  Lokaler Entwicklungs-Start
REM Startet Backend (Port 4000) und Frontend (Port 3000)
REM gleichzeitig im Watch-Mode.
REM Stoppen: Strg+C im Fenster.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.
echo Backend:  http://localhost:4000
echo Frontend: http://localhost:3000
echo.
echo Strg+C zum Beenden.
echo.

call npm run dev
pause
