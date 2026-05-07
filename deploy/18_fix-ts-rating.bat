@echo off
REM ============================================================
REM 18_fix-ts-rating.bat
REM Fix TS-Compile-Errors im Rating-Endpoint:
REM Inline-Middleware (`app.get(path, requireAuth, handler)`)
REM bricht in Express 5 die Type-Inference fuer req.params.id.
REM Fix: app.use("/users", requireAuth) + reines app.get ohne
REM Inline-Middleware.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

git status --short
echo.

git add backend/src/index.ts
if errorlevel 1 (
    echo Fehler beim git add.
    pause
    exit /b 1
)

git commit -m "fix(backend): Inline-Middleware bei /users/:id/ratings vermeidet TS-Type-Inference-Bug"
if errorlevel 1 (
    echo.
    echo Nichts zu committen oder Fehler.
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
echo  Fix gepusht. Railway baut jetzt neu (1-2 Minuten).
echo ============================================================
echo.
pause
