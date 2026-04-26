@echo off
REM ============================================================
REM 01_setup-local.bat
REM Installiert alle Dependencies (root + backend + frontend)
REM und initialisiert das Git-Repo, falls noch nicht vorhanden
REM oder reparieren wenn kaputt.
REM Idempotent: kann mehrfach ausgefuehrt werden.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

REM --- 1) Dependencies installieren -------------------------------
echo [1/3] npm install (root + workspaces) ...
call npm install
if errorlevel 1 (
    echo.
    echo FEHLER beim npm install. Bitte Output pruefen.
    pause
    exit /b 1
)

REM --- 2) Git-Status pruefen, initialisieren oder reparieren ------
set GIT_OK=0
if exist ".git\objects" (
    git rev-parse --is-inside-work-tree >nul 2>&1
    if not errorlevel 1 set GIT_OK=1
)

if "%GIT_OK%"=="0" (
    if exist ".git" (
        echo.
        echo [2/3] Kaputter .git-Ordner gefunden — wird zurueckgesetzt ...
        rmdir /s /q ".git" 2>nul
        if exist ".git" (
            echo.
            echo FEHLER: .git-Ordner konnte nicht geloescht werden.
            echo         Vermutlich ist eine Datei in Benutzung — schliesse
            echo         alle Editoren / VS Code / Explorer-Fenster und
            echo         versuche es erneut. Im Notfall manuell loeschen:
            echo         %CD%\.git
            pause
            exit /b 1
        )
    )
    echo.
    echo [2/3] Git initialisieren ...
    git init -b main
    if errorlevel 1 (
        echo.
        echo FEHLER bei git init. Ist Git installiert? https://git-scm.com/download/win
        pause
        exit /b 1
    )
    git config user.email "mdbaukonzept@gmail.com"
    git config user.name "Marco"
) else (
    echo.
    echo [2/3] Git-Repo existiert und ist gesund — ueberspringe init.
)

REM --- 3) Erster Commit (nur wenn noch keiner existiert) ----------
git rev-parse --verify HEAD >nul 2>&1
if errorlevel 1 (
    echo.
    echo [3/3] Erster Commit ...
    git add -A
    git commit -m "Initial MVP: backend (Express+Prisma) + frontend (Next.js)"
    if errorlevel 1 (
        echo.
        echo FEHLER beim ersten Commit. Pruefe Output.
        pause
        exit /b 1
    )
) else (
    echo.
    echo [3/3] Es gibt bereits Commits, ueberspringe ersten Commit.
    echo       Aktueller Stand:
    git log --oneline -5
)

echo.
echo ============================================================
echo  FERTIG. Naechster Schritt: 02_github-remote.bat
echo  (vorher: GitHub-Repo auf https://github.com/new anlegen)
echo ============================================================
echo.
pause
