@echo off
REM ============================================================
REM push_phaseQ.bat -- Deploy Phase Q1 (Co-Investment Hub)
REM Entfernt zuerst zwei temporaere Hilfsdateien, die beim Bauen
REM entstanden sind, danach Commit + Push (Vercel + Railway
REM deployen automatisch). Commit-Message aus deploy\commit_msg.txt.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

REM --- Temp-Dateien aus dem Bau entfernen (waren im Sandbox nicht loeschbar) ---
if exist "backend\src\_qtail.txt" del /F /Q "backend\src\_qtail.txt"
if exist "frontend\lib\_qapi.txt" del /F /Q "frontend\lib\_qapi.txt"

if exist ".git\index.lock" del /F /Q ".git\index.lock"

set "MSGFILE=%~dp0commit_msg.txt"
set "MSG="
if exist "%MSGFILE%" set /p MSG=<"%MSGFILE%"
if "%MSG%"=="" set "MSG=Phase Q1 Co-Investment Hub %DATE% %TIME%"

echo Commit-Message: %MSG%
echo.
git status --short
echo.

git add -A
git commit -m "%MSG%"
if errorlevel 1 (
    echo.
    echo Nichts zu committen oder Fehler. Pruefe Output.
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
echo  Phase Q1 gepusht. Railway baut Backend (prisma generate +
echo  migrate deploy fuehrt die Co-Investment-Migration aus),
echo  Vercel baut das Frontend.
echo.
echo  NACH ~2 Min testen:
echo   1) Backend Health: https://dealflow-ai-backend-production.up.railway.app/health
echo   2) Frontend: https://infinityoikos.com/co-investments
echo ============================================================
echo.
pause
