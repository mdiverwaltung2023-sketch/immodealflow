@echo off
setlocal
REM ============================================================
REM redeploy.bat  --  Deploy ohne Code-Aenderung erzwingen
REM Legt einen leeren Commit an und pusht ihn. Nutzen, wenn
REM Vercel/Railway auf einem alten Build haengen oder ein Push
REM uebersprungen wurde.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo Eine Taste druecken, um Redeploy zu pushen...
pause >nul

if exist ".git\index.lock" del /F /Q ".git\index.lock"

echo [1/2] Leeren Commit anlegen...
git commit --allow-empty -m "chore: trigger redeploy"
if errorlevel 1 (
    echo FEHLER bei commit.
    pause
    exit /b 1
)

echo.
echo [2/2] Push...
git push
if errorlevel 1 (
    echo FEHLER bei push.
    pause
    exit /b 1
)

echo.
echo === FERTIG ===
echo Vercel und Railway bauen jetzt neu mit aktuellem HEAD.
echo.
pause
endlocal
