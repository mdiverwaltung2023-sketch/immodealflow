@echo off
REM ============================================================
REM 44_logo-redesign.bat
REM
REM Logo-Ueberarbeitung — neuer Schriftzug "INFINITY OIKOS"
REM (vorher generischer Text neben Symbol).
REM
REM Aenderungen:
REM   - frontend/components/BrandLogo.tsx komplett neu:
REM       BrandLogo (Symbol)        - goldener C-Kreis mit
REM         stilisierter Figur (Kopf, Arme, V-Beine) + Akzent-Tropfen
REM       BrandWordmark             - SVG-Schriftzug "INFINITY" (gross)
REM         und "OIKOS" (kleiner, weit gesperrt) im Goldverlauf
REM       BrandLockup               - Symbol + Schriftzug nebeneinander
REM         (row) oder gestapelt (stack)
REM       Zwei Varianten: "gold" (heller Goldverlauf, fuer dunklen
REM         Hintergrund wie Landing/Sign-In) und "warm" (Bronze-Amber,
REM         fuer hellen Sidebar-Hintergrund)
REM
REM   - frontend/components/SideNav.tsx:
REM       Header oben links nutzt jetzt BrandLogo (size=42, warm) +
REM       BrandWordmark (width=130, warm) statt Plain-Text.
REM       OIKOS gross genug (font-size 15, letter-spacing 9) -^>
REM       gut lesbar.
REM
REM   - frontend/components/TopBar.tsx:
REM       Mobile-Logo zeigt Symbol + "INFINITY OIKOS" in serif/golden.
REM       Bonus: defekter Backslash im Link-href "\dashboard" gefixt
REM       auf "/dashboard".
REM
REM   - frontend/components/AuthHero.tsx:
REM       BrandLockup variant geaendert von "light" -^> "gold"
REM       (alte API existiert nicht mehr).
REM
REM Alles ist pure SVG im Code — keine Bilddatei, keine neuen
REM Dependencies, kein npm install noetig.
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

git commit -m "feat(brand): neues Infinity-Oikos-Logo (SVG, gold) im Sidebar-Header + Mobile-TopBar"
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
echo  Logo-Redesign gepusht.
echo  Vercel baut neu (^~1-2 Min).
echo.
echo  Sobald gruen: oben links siehst du das goldene Symbol +
echo  "INFINITY OIKOS"-Schriftzug. OIKOS ist deutlich lesbar.
echo
echo  Falls dir das stilisierte Symbol nicht zusagt: gerne sagen,
echo  dann passe ich die Form an (z.B. abstrakter, oder konkreter
echo  ein Haus-Motiv passend zu Oikos = Heim).
echo ============================================================
echo.
pause
