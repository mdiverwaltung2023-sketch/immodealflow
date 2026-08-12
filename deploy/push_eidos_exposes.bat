@echo off
REM Deploy: Eidos-Exposé-Endpoint (GET /eidos/exposes, Shared-Secret) -> Railway
cd /d "%~dp0\.."
if exist ".git\index.lock" del /F /Q ".git\index.lock"
echo === Projektordner: %CD% ===
git add backend/src/index.ts backend/src/lib/exposePdf.ts backend/package.json
git commit -m "feat(eidos): GET /eidos/exposes - secret-geschuetzte Listing-Liste fuer Sales Copilot"
git push
echo.
echo == Push raus. Railway (Backend) deployt automatisch. ==
echo Test danach: https://api.infinityoikos.com/eidos/exposes?secret=DEIN_SECRET
pause
