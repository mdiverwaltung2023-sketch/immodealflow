@echo off
REM ============================================================
REM 43_hotfix-admin-auth.bat
REM
REM Hotfix fuer Phase H8 — die /admin/coins/*-Routes hatten keine
REM requireAuth-Middleware. Folge: req.userId war undefined, und
REM ensureAdmin -^> prisma.user.findUnique({ where: { id: undefined }})
REM warf einen Prisma-Validation-Error. Im Frontend kam dadurch die
REM "Application error: a server-side exception"-Page.
REM
REM Fix: app.use("/admin", requireAuth) zwischen "/marketplace" und
REM "/import" eingehaengt. Damit wird der Bearer-Token vor jedem
REM /admin/coins/*-Endpoint validiert und req.userId gesetzt.
REM
REM Keine neuen Dependencies, kein npm install noetig.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

git status --short
echo.

git add -A
if errorlevel 1 (
    echo Fehler beim git add.
    pause
    exit /b 1
)

git commit -m "fix(admin): requireAuth-Middleware fuer /admin/* (Coin-Dashboard 500)"
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
echo  Hotfix gepusht. Railway baut neu (^~2 Min).
echo  Sobald gruen: /admin/coins sollte ohne Fehler oeffnen.
echo ============================================================
echo.
pause
