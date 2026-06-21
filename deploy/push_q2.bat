@echo off
setlocal
REM ============================================================
REM push_q2.bat -- Robuster Deploy (Phase Q2)
REM Liest die Commit-Message DIREKT aus deploy\commit_msg.txt
REM via "git commit -F" -> keine Batch-Sonderzeichen-Probleme.
REM Pusht IMMER, auch wenn schon committet wurde (z.B. durch
REM einen vorher abgebrochenen Lauf). Fenster bleibt offen.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

if exist ".git\index.lock" del /F /Q ".git\index.lock"

echo --- git add -A ---
git add -A

echo --- git commit (falls es etwas zu committen gibt) ---
git commit -F "deploy\commit_msg.txt"
echo (Hinweis: "nothing to commit" ist OK, wenn schon committet wurde.)
echo.

echo --- git push ---
git push
if errorlevel 1 (
    echo.
    echo PUSH fehlgeschlagen. Internet/VPN pruefen und erneut starten.
    echo Der Commit ist lokal sicher vorhanden.
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Erfolgreich gepusht. Railway (Backend + Migration) und
echo  Vercel (Frontend) deployen automatisch.
echo.
echo  NACH ~2 Min testen:
echo   1) https://dealflow-ai-backend-production.up.railway.app/health
echo   2) https://infinityoikos.com/co-investments
echo ============================================================
echo.
pause
