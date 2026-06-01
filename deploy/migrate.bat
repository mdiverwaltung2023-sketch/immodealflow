@echo off
setlocal enabledelayedexpansion
REM ============================================================
REM migrate.bat  --  Datenbank-Migration
REM Erzeugt eine neue Prisma-Migration aus dem geaenderten
REM Schema (backend/prisma/schema.prisma) und wendet sie auf
REM die in backend/.env hinterlegte DB an.
REM Danach mit push.bat deployen.
REM ============================================================

cd /d "%~dp0\..\backend"
echo.
echo === Backend-Ordner: %CD% ===
echo.

if not exist ".env" (
    echo FEHLER: backend\.env fehlt.
    echo         Braucht DATABASE_URL. Vorlage: backend\.env.example
    pause
    exit /b 1
)

echo Migrationsname (kurz, snake_case, z.B. add_doc_fields):
set /p MIG_NAME="Name: "
if "!MIG_NAME!"=="" (
    echo Kein Name angegeben - Abbruch.
    pause
    exit /b 1
)

echo.
echo [1/2] Prisma Client generieren ...
call npx prisma generate
if errorlevel 1 (
    echo FEHLER bei prisma generate.
    pause
    exit /b 1
)

echo.
echo [2/2] Migration erzeugen + anwenden (--name !MIG_NAME!) ...
call npx prisma migrate dev --name !MIG_NAME!
if errorlevel 1 (
    echo.
    echo FEHLER bei prisma migrate dev.
    echo Tipp: DATABASE_URL erreichbar? DB laeuft?
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  FERTIG. Migration angewandt.
echo  Naechster Schritt: deploy\push.bat
echo ============================================================
echo.
pause
endlocal
