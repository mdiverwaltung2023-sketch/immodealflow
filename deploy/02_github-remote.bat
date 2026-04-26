@echo off
REM ============================================================
REM 02_github-remote.bat
REM Verbindet das lokale Repo mit einem GitHub-Repo und pusht.
REM
REM VORAUSSETZUNG:
REM   - Du hast 01_setup-local.bat ausgefuehrt (Git-Repo + erster Commit)
REM   - Du hast auf https://github.com/new ein neues, leeres
REM     (privates) Repo angelegt.
REM   - Du hast die HTTPS-URL kopiert, z.B.
REM     https://github.com/DEIN-USER/immodealflow.git
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

REM --- Pruefen, ob ein gueltiges Git-Repo existiert ---------------
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo FEHLER: Kein gueltiges Git-Repository gefunden.
    echo         Bitte zuerst 01_setup-local.bat ausfuehren.
    pause
    exit /b 1
)

REM --- Pruefen, ob mindestens ein Commit existiert ----------------
git rev-parse --verify HEAD >nul 2>&1
if errorlevel 1 (
    echo FEHLER: Es existiert noch kein Commit. Bitte zuerst 01_setup-local.bat
    echo         vollstaendig ausfuehren - der Commit-Schritt ist Pflicht.
    pause
    exit /b 1
)

REM --- Hat das Repo bereits ein origin-Remote? --------------------
git remote get-url origin >nul 2>&1
if not errorlevel 1 (
    echo Origin-Remote existiert bereits:
    git remote -v
    echo.
    set /p REPLACE="Soll der bestehende Remote ueberschrieben werden? (j/N): "
    if /i not "%REPLACE%"=="j" (
        echo Origin bleibt unveraendert. Push wird trotzdem versucht.
        goto DO_PUSH
    )
    git remote remove origin
)

REM --- URL abfragen -----------------------------------------------
echo.
set /p REPO_URL="GitHub-Repo-URL einfuegen (z.B. https://github.com/USER/repo.git): "
if "%REPO_URL%"=="" (
    echo Keine URL angegeben - Abbruch.
    pause
    exit /b 1
)

git remote add origin "%REPO_URL%"
echo.
echo Origin gesetzt:
git remote -v
echo.

:DO_PUSH
echo Pushe nach origin/main ...
git push -u origin main
if errorlevel 1 (
    echo.
    echo FEHLER beim Push. Moegliche Ursachen:
    echo   - Repo-URL falsch oder Tippfehler
    echo   - Authentifizierung schlaegt fehl (bei erstem Push oeffnet sich
    echo     der Browser fuer GitHub-Login - ggf. ist das Fenster verdeckt)
    echo   - Repo nicht leer (dann hat GitHub schon einen README/License-Commit;
    echo     dann erst: git pull origin main --allow-unrelated-histories)
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  FERTIG. Repo ist auf GitHub.
echo  Naechster Schritt: Railway-Projekt anlegen (siehe deploy\README.md, Abschnitt B).
echo ============================================================
echo.
pause
