@echo off
REM ============================================================
REM 23_migrate-listing-v2.bat
REM
REM Prisma-Migration: Listing v2 — viele neue optionale Felder
REM (Bausubstanz, Energie, Vermietung, Mieter-Mix, Highlights).
REM
REM Schritt 1 (lokal):  npx prisma migrate dev --name listing_v2
REM   -> erzeugt SQL-Migration im Repo + spielt sie auf lokaler DB
REM Schritt 2: BAT 24_commit-inserat-v2 macht commit + push
REM   -> Railway laeuft beim Deploy automatisch "prisma migrate deploy"
REM
REM WICHTIG: Vor dem Klick muss DATABASE_URL in backend/.env auf die
REM lokale Postgres-DB zeigen (oder leer = wir machen direct Deploy
REM auf Railway-Prod, was hier OK ist da alle Felder NULLABLE sind).
REM ============================================================

cd /d "%~dp0\..\backend"
echo.
echo === Backend-Ordner: %CD% ===
echo.

echo Erzeuge Migration "listing_v2" und spielt sie auf die DB...
call npx prisma migrate dev --name listing_v2 --skip-seed
if errorlevel 1 (
    echo.
    echo FEHLER bei der Migration. Pruefe DATABASE_URL und Schema.
    pause
    exit /b 1
)

echo.
echo Generiere Prisma-Client neu...
call npx prisma generate
if errorlevel 1 (
    echo.
    echo FEHLER bei prisma generate.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Migration erfolgreich angelegt + Prisma-Client aktualisiert.
echo  Naechster Schritt: 24_commit-inserat-v2.bat klicken,
echo  damit alles ins Repo kommt und Railway deployt.
echo ============================================================
echo.
pause
