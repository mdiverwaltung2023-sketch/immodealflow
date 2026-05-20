@echo off
REM ============================================================
REM 110_image-reorder.bat
REM
REM Feature: Bilder im Listing-Edit per Drag-and-Drop sortieren
REM (Kanban-Style, funktioniert auf Desktop + Touch).
REM
REM Neu im Repo:
REM   - Backend: PATCH /me/listings/:id/images/reorder
REM   - Frontend: SortableImageCard via @dnd-kit/sortable
REM   - 3 neue npm-Deps: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
REM
REM npm install ist hier wichtig, damit das Lockfile mit den neuen Deps
REM mitgezogen wird (Vercel-Build wuerde sonst meckern).
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"

echo === [1/5] npm install (zieht @dnd-kit-Packages + aktualisiert Lockfile) ===
call npm install --no-audit --no-fund
if errorlevel 1 (
    echo FEHLER: npm install fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo === [2/5] Backend: tsc --noEmit ===
call npx -w backend tsc --noEmit
if errorlevel 1 (
    echo FEHLER: Backend TypeScript-Check fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo === [3/5] Frontend: next build ===
call npm run build -w frontend
if errorlevel 1 (
    echo FEHLER: Frontend build fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo === [4/5] git add + commit ===
call git status -s
call git add -A
call git commit -m "Feature: Bild-Reihenfolge per Drag-and-Drop (Kanban) auf Listing-Edit-Seite + Backend-Reorder-Endpoint"
if errorlevel 1 (
    echo HINWEIS: nichts zu committen.
)

echo.
echo === [5/5] git push origin main ===
call git push origin main
if errorlevel 1 (
    echo FEHLER: git push fehlgeschlagen.
    pause
    exit /b 1
)

echo.
call git log --oneline -3
echo.
echo === FERTIG. In ~1-2 Min auf https://infinityoikos.com pruefen:    ===
echo === Inserat bearbeiten, Bild kurz druecken+ziehen, neue           ===
echo === Reihenfolge erscheint sofort (erstes Bild = Cover-Badge).     ===
echo.
pause
