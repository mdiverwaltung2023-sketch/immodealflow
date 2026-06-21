@echo off
REM ============================================================
REM push_coinvest_visual.bat -- Deploy Phase Q Visual
REM Entfernt zuerst zwei temporaere Sync-Test-Dateien, dann
REM Commit + Push (Vercel + Railway deployen automatisch).
REM Commit-Message aus deploy\commit_msg.txt.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

REM --- Temporaere Sync-Test-Dateien entfernen ---
if exist "_synctest_bash.txt" del /F /Q "_synctest_bash.txt"
if exist "_synctest_host.txt" del /F /Q "_synctest_host.txt"

if exist ".git\index.lock" del /F /Q ".git\index.lock"

set "MSGFILE=%~dp0commit_msg.txt"
set "MSG="
if exist "%MSGFILE%" set /p MSG=<"%MSGFILE%"
if "%MSG%"=="" set "MSG=Phase Q Visual %DATE% %TIME%"

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
    echo FEHLER beim Push. Internet/VPN pruefen, dann erneut starten.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Phase Q Visual gepusht. Railway baut Backend (prisma
echo  generate + migrate deploy: kind/imageUrl), Vercel das
echo  Frontend.
echo.
echo  NACH ~2 Min testen:
echo   1) https://dealflow-ai-backend-production.up.railway.app/health
echo   2) https://infinityoikos.com/co-investments
echo ============================================================
echo.
pause
