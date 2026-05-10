@echo off
REM ============================================================
REM 60_rentals-l2-claude-lib.bat
REM
REM Phase L2 — KI-Bibliothek fuer Vermietungs-Bewerberbewertung.
REM
REM Aenderungen in backend/src/lib/claude.ts:
REM
REM   - Types RentalUnitInput + RentalApplicantInput
REM       Strukturierte Daten fuer die KI. KEINE sensiblen Merkmale
REM       (Ethnie, Religion, Geschlecht, Familienstand) — diese Felder
REM       existieren im Datenmodell gar nicht.
REM
REM   - Type RentalApplicantEvalResult
REM       Output-Struktur fuer ApplicantEvaluation-Tabelle.
REM
REM   - System-Prompt RENTAL_EVAL_SYSTEM (verbindlich fuer Claude):
REM       Verbietet ausdruecklich Bewertung sensibler Merkmale.
REM       Fokus ausschliesslich auf wirtschaftliche/organisatorische
REM       Faktoren. Keine endgueltigen Entscheidungen. Neutral, sachlich.
REM
REM   - Helpers rentalUnitBriefing() + applicantBriefing():
REM       Serialisieren die Daten als deutsches Briefing.
REM
REM   - evaluateRentalApplicant({ unit, applicant }):
REM       Tool-Use mit 13 Pflicht-Feldern + 2 optional:
REM         rating, summary, strengths[], risks[], openQuestions[]
REM         5 Faktor-Felder: financialStability, sizeFit,
REM           expectedDuration, reliability, communication
REM         recommendViewing (bool), requestDocuments?, suggestFollowUp?
REM         rationale
REM       Temperatur 0.2, max 1500 Tokens.
REM       Wenn requestDocuments oder suggestFollowUp leer -^> undefined
REM       (sauber gegen leere Strings im Output).
REM
REM Voraussetzung: ANTHROPIC_API_KEY in Railway-ENV (war eh schon
REM fuer K-Phase noetig).
REM
REM Keine neuen Dependencies, kein npm install.
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

git commit -m "feat(rentals): Phase L2 lib/claude.ts +evaluateRentalApplicant (Anti-Diskriminierungs-System-Prompt)"
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
echo  Phase L2 gepusht. Railway baut neu (^~2 Min).
echo  Funktion ist live, aber noch nicht ueber API erreichbar —
echo  Build sollte sauber durchlaufen, API-Verhalten bleibt gleich.
echo
echo  Naechster Schritt: BAT 61 = Phase L3 (Backend-Endpoints
echo    fuer RentalUnit-CRUD, Applications + Bewertungs-Endpoint).
echo ============================================================
echo.
pause
