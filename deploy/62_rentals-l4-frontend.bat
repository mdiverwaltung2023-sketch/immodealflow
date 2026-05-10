@echo off
REM ============================================================
REM 62_rentals-l4-frontend.bat
REM
REM Phase L4 — Frontend fuer Vermietungsplattform.
REM Damit ist Phase L (L1-L4) komplett.
REM
REM Aenderungen:
REM
REM   - frontend/lib/api.ts:
REM       RentalStatusEnum, ApplicationStatusEnum, ApplicantRatingEnum
REM       + Labels-Maps
REM       RentalUnitImageSchema, RentalUnitSchema, RentalUnitListItemSchema
REM       ApplicantEvaluationSchema
REM       RentalApplicationSchema, RentalApplicationListItemSchema,
REM       RentalApplicationDetailSchema
REM
REM   - frontend/components/SideNav.tsx:
REM       SECTION_SELLER bekommt "Vermietung" (/rentals)
REM       neues IcKey-Icon.
REM
REM   - frontend/app/rentals/page.tsx (Server Component):
REM       Liste der Mietobjekte als Karten-Grid mit Bild-Cover,
REM       Status-Pill, Bewerber-Anzahl, Sortierung
REM       (AVAILABLE -^> RESERVED -^> DRAFT -^> RENTED -^> ARCHIVED).
REM       Status-Uebersicht oben.
REM
REM   - frontend/app/rentals/new/page.tsx + NewRentalUnitForm.tsx:
REM       Anlegen-Form (Pflicht: Titel, Stadt, Zimmer, Wohnflaeche,
REM       Kaltmiete; optional: Stadtteil, Nebenkosten, Kaution,
REM       Beschreibung). Nach Submit -^> /rentals/^<id^>.
REM
REM   - frontend/app/rentals/[id]/page.tsx (Server Component):
REM       Detail mit Header, Anti-Diskriminierungs-Hinweis,
REM       Eckdaten-Card, Bilder-Galerie, ApplicationsSection.
REM
REM   - frontend/app/rentals/[id]/ApplicationsSection.tsx (Client):
REM       Bewerber-Liste mit Status-Pills + KI-Rating-Badge der
REM       letzten Bewertung. "Bewerber hinzufuegen"-Form mit
REM       expliziter Anti-Diskriminierungs-Warnung im Header.
REM
REM   - frontend/app/rentals/[id]/applications/[appId]/page.tsx
REM     (Server Component):
REM       Bewerber-Detail-Page mit Bewerber-Daten, Status-Form,
REM       KI-Bewertungs-Card, History.
REM
REM   - frontend/app/rentals/[id]/applications/[appId]/
REM     ApplicationStatusForm.tsx (Client):
REM       Select fuer Status-Wechsel (PATCH /me/rental-applications/:id).
REM
REM   - frontend/app/rentals/[id]/applications/[appId]/
REM     ApplicantEvaluationCard.tsx (Client):
REM       Zeigt letzte Bewertung mit Rating-Badge, Besichtigungs-
REM       Empfehlung, 5 Faktor-Bloecke (Finanzen, Wohnungsgroesse,
REM       Mietdauer, Zuverlaessigkeit, Kommunikation), Staerken/
REM       Risiken/offene Fragen, Handlungsempfehlungen, Begruendung.
REM       Button "Bewertung erstellen" / "Neu bewerten" -^> POST
REM       /me/rental-applications/:id/evaluate.
REM
REM Voraussetzung: ANTHROPIC_API_KEY in Railway-ENV (war fuer K-Phase
REM eh schon noetig).
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

git commit -m "feat(rentals): Phase L4 Frontend — Liste, Detail, Bewerber + KI-Bewertung"
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
echo  Phase L4 gepusht — Phase L (L1-L4) komplett.
echo  Vercel baut neu (^~1-2 Min).
echo
echo  Smoke-Test in der App:
echo    1) Sidebar zeigt "Vermietung" (Schluessel-Icon)
echo    2) /rentals -^> leere Liste, Button "Mietobjekt anlegen"
echo    3) Anlegen-Formular ausfuellen -^> Detail-Page
echo    4) Auf der Detail-Page "Bewerber hinzufuegen" anklicken,
echo       Bewerber-Daten eintragen
echo    5) Bewerber-Detail oeffnen -^> "Bewertung erstellen"
echo       -^> Claude liefert nach 5-15 Sek. die Einschaetzung
echo       mit Anti-Diskriminierungs-Sperre.
echo
echo  Phase L ist damit komplett — KI-Vermietungsassistent live.
echo ============================================================
echo.
pause
