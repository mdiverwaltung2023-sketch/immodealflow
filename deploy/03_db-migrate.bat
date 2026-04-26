@echo off
REM ============================================================
REM 03_db-migrate.bat
REM Erzeugt die initiale Prisma-Migration und wendet sie auf
REM die in backend/.env hinterlegte Datenbank an.
REM
REM VORAUSSETZUNG:
REM   - backend/.env existiert mit DATABASE_URL (Railway-Postgres
REM     oder lokales Postgres).
REM ============================================================

cd /d "%~dp0\..\backend"
echo.
echo === Backend-Ordner: %CD% ===
echo.

if not exist ".env" (
    echo FEHLER: backend\.env fehlt.
    echo         Lege die Datei an mit DATABASE_URL und ANTHROPIC_API_KEY.
    echo         Vorlage siehe backend\.env.example.
    pause
    exit /b 1
)

echo [1/2] Prisma Client generieren ...
call npx prisma generate
if errorlevel 1 (
    echo FEHLER bei prisma generate.
    pause
    exit /b 1
)

echo.
echo [2/2] Migration anwenden (--name init beim ersten Mal) ...
call npx prisma migrate dev --name init
if errorlevel 1 (
    echo.
    echo FEHLER bei prisma migrate dev.
    echo Tipp: Wenn DATABASE_URL nicht erreichbar ist, pruefe
    echo       Netzwerk/Firewall und ob die DB laeuft.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  FERTIG. Schema ist in der Datenbank.
echo  Naechster Schritt: 04_dev-start.bat
echo ============================================================
echo.
pause
