@echo off
REM ============================================================
REM retry_push.bat -- Nur den Push wiederholen.
REM Der Commit (Phase Q1) ist bereits lokal angelegt; hier wird
REM ausschliesslich erneut zu GitHub gepusht. Bis zu 5 Versuche.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

if exist ".git\index.lock" del /F /Q ".git\index.lock"

REM Groesseren Puffer setzen, falls die Verbindung beim Senden abriss.
git config http.postBuffer 524288000

set /a tries=0
:retry
set /a tries+=1
echo --- Push-Versuch %tries% ---
git push
if not errorlevel 1 goto ok
if %tries% GEQ 5 goto fail
echo Versuch %tries% fehlgeschlagen. Neuer Versuch in 5 Sekunden...
timeout /t 5 >nul
goto retry

:fail
echo.
echo ============================================================
echo  Push nach %tries% Versuchen fehlgeschlagen.
echo  Pruefe Internet/VPN/Firewall und starte die BAT erneut.
echo  Der Commit ist lokal sicher vorhanden - nichts geht verloren.
echo ============================================================
echo.
pause
exit /b 1

:ok
echo.
echo ============================================================
echo  Push erfolgreich. Railway (Backend) und Vercel (Frontend)
echo  deployen automatisch.
echo.
echo  NACH ~2 Min testen:
echo   1) https://dealflow-ai-backend-production.up.railway.app/health
echo   2) https://infinityoikos.com/co-investments
echo ============================================================
echo.
pause
