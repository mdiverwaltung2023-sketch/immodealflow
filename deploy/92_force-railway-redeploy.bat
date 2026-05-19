@echo off
setlocal
chcp 850 >nul

REM ============================================================
REM 92_force-railway-redeploy.bat
REM
REM Triggert Railway via leerem Commit zum Neubau.
REM Hintergrund: Railway haengt manchmal auf einem alten Build
REM fest, wenn ein vorheriger Push uebersprungen wurde.
REM Ein "empty commit" forciert einen frischen Build/Deploy.
REM ============================================================

cd /d "%~dp0\.."

echo.
echo === Projektordner: %CD% ===
echo Druecke eine Taste, um Redeploy-Trigger zu pushen...
pause >nul

if exist ".git\index.lock" del /F /Q ".git\index.lock"

echo [1/2] Leeren Commit anlegen...
git commit --allow-empty -m "chore: trigger Railway redeploy (Phase F.2 Images)"
if errorlevel 1 (
    echo FEHLER bei commit.
    pause
    exit /b 1
)

echo.
echo [2/2] Push...
git push origin main
if errorlevel 1 (
    echo FEHLER bei push.
    pause
    exit /b 1
)

echo.
echo === FERTIG ===
echo Railway baut jetzt neu mit aktuellem HEAD.
echo Pruefe in 1-2 Min im Dashboard, ob 25 migrations gefunden werden
echo und "Applied migration 20260517125930_20260517_add_offmarket_images"
echo in den Deploy-Logs auftaucht.
echo.
pause
endlocal
