@echo off
REM ============================================================
REM 103b_build-capture.bat
REM
REM Frontend Build mit Output in datei deploy\build_out.txt.
REM Genau wie 103, aber mit Tee-aehnlicher Umleitung — Claude
REM kann die Datei direkt lesen ohne dass du Screenshots machen
REM musst.
REM ============================================================

cd /d "%~dp0\.."
echo Build laeuft, Output in deploy\build_out.txt ...
echo (Konsole bleibt leer bis Ende — das ist Absicht.)
echo.

(
  echo === npm install ===
  call npm install
  echo === RC %errorlevel% ===
  echo.
  echo === cd frontend ^&^& next build ===
  cd frontend
  call npm run build
  echo === RC %errorlevel% ===
) > deploy\build_out.txt 2>&1

echo.
echo Fertig. Datei: deploy\build_out.txt
echo.
type deploy\build_out.txt | findstr /C:"FEHLER" /C:"error" /C:"ERROR" /C:"Error" /C:"failed" /C:"Failed" 2>nul
echo.
pause
