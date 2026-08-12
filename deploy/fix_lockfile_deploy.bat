@echo off
REM Deploy-Fix: package-lock.json mit pdfkit synchronisieren.
REM Grund: Commit aae835b hat pdfkit/@types/pdfkit zu backend/package.json
REM hinzugefuegt, aber die Lockfile nicht aktualisiert -> Railway "npm ci" brach ab
REM ("Missing: pdfkit ... from lock file") -> Build failed -> /eidos/exposes blieb 404.
cd /d "%~dp0\.."

if exist ".git\index.lock" del /F /Q ".git\index.lock"
echo === Projektordner: %CD% ===

git add package-lock.json backend/package.json
git commit -m "fix(build): package-lock.json mit pdfkit/@types/pdfkit synchronisieren - repariert Railway npm ci und bringt /eidos/exposes live"
git push

echo.
echo == Push raus. Railway baut neu - "npm ci" sollte jetzt durchlaufen. ==
echo Pruefen (ca. 2-3 Min nach Push):
echo   https://api.infinityoikos.com/eidos/exposes?secret=DEIN_EIDOS_API_SECRET
echo   -> erwartet JSON { "exposes": [ ... ] } statt "Cannot GET /eidos/exposes"
pause
