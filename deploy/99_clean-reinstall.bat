@echo off
REM ============================================================
REM 99_clean-reinstall.bat
REM Notfall-Skript: loescht alle node_modules und installiert neu.
REM Nutzen, wenn etwas mit Dependencies kaputt ist.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.
echo ACHTUNG: Loescht node_modules in root, backend und frontend.
set /p CONFIRM="Wirklich fortfahren? (j/N): "
if /i not "%CONFIRM%"=="j" (
    echo Abbruch.
    pause
    exit /b 0
)

echo.
echo Loesche node_modules ...
if exist "node_modules" rmdir /s /q "node_modules"
if exist "backend\node_modules" rmdir /s /q "backend\node_modules"
if exist "frontend\node_modules" rmdir /s /q "frontend\node_modules"

echo.
echo Loesche package-lock.json (root) ...
if exist "package-lock.json" del /q "package-lock.json"

echo.
echo Neuinstallation ...
call npm install
if errorlevel 1 (
    echo FEHLER beim npm install.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  FERTIG. Dependencies neu installiert.
echo ============================================================
echo.
pause
