@echo off
setlocal
chcp 850 >nul

REM ============================================================
REM 97_image-manager-hardcoded.bat
REM
REM ImageManager.tsx hartcodiert:
REM  - API_BASE = https://api.infinityoikos.com (direkt im Code)
REM  - Eigene authHeaders ohne useApiFetch-Hook
REM  - Debug-Output in der UI (zeigt API_BASE + Status)
REM  - Detaillierte Fehlertexte mit URLs
REM
REM Damit ist garantiert keine env-var/Hook-Abhaengigkeit mehr,
REM und im Fehlerfall sehen wir auf der Seite was los ist.
REM ============================================================

cd /d "%~dp0\.."

echo.
echo === Projektordner: %CD% ===
echo Druecke eine Taste...
pause >nul
echo.

if exist ".git\index.lock" del /F /Q ".git\index.lock"

echo [1/4] Fetch + Reset...
git fetch origin
git reset --hard origin/main
if errorlevel 1 ( echo FEHLER reset. & pause & exit /b 1 )

echo [2/4] ImageManager.tsx einspielen...
copy /Y "deploy\_ImageManager.tsx.bak" "frontend\app\offmarket\leads\[id]\edit\ImageManager.tsx" >nul
echo Done.

echo.
echo [3/4] Stage + Commit...
git add frontend/app/offmarket/leads/[id]/edit/ImageManager.tsx
git status --short
git commit -m "fix(offmarket): ImageManager mit hardcoded API base und UI-Debug-Output"
if errorlevel 1 echo HINWEIS commit status != 0

echo.
echo [4/4] Push...
git push origin main
if errorlevel 1 ( echo FEHLER push. & pause & exit /b 1 )

echo.
echo === FERTIG ===
echo Vercel baut neu (2-3 Min).
echo Im Inkognito mit Strg+Shift+R neu laden.
echo Beim naechsten Upload-Versuch siehst du jetzt
echo unter dem "Bild hochladen"-Button eine kleine graue
echo "Debug:"-Zeile mit der API-URL und genaue Fehlertexte.
echo Schick mir einen Screenshot davon.
echo.
pause
endlocal
