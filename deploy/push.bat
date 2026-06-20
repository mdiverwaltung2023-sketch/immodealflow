@echo off
REM ============================================================
REM push.bat  --  HAUPT-SKRIPT fuer Deploys
REM Commit + Push aller Aenderungen. Vercel und Railway
REM deployen danach automatisch.
REM
REM Die Commit-Message wird AUTOMATISCH aus deploy\commit_msg.txt
REM gelesen (von Claude gepflegt) - kein Tippen mehr noetig.
REM Fehlt die Datei, wird ein Zeitstempel verwendet.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

if exist ".git\index.lock" del /F /Q ".git\index.lock"

REM --- Commit-Message bestimmen ---
set "MSGFILE=%~dp0commit_msg.txt"
set "MSG="
if exist "%MSGFILE%" set /p MSG=<"%MSGFILE%"
if "%MSG%"=="" set "MSG=Update %DATE% %TIME%"

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
echo  Commit + Push erfolgreich.
echo  Message: %MSG%
echo  Vercel (Frontend) und Railway (Backend) deployen automatisch.
echo ============================================================
echo.
pause
