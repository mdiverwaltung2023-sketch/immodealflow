@echo off
REM ============================================================
REM 24_commit-inserat-v2.bat
REM
REM Phase F8 - Inserat v2 (MFH/Gewerbe-USP):
REM
REM   Schema:
REM     +25 optionale Felder im Listing-Modell:
REM     yearBuilt, lastRenovation, condition, livingArea,
REM     commercialArea, landArea, floors, residentialUnits,
REM     commercialUnits, energyClass, energyConsumption,
REM     energyCarrier, heatingType, actualRent, vacancyRate,
REM     waltMonths, rentIndexed, rentEscalation,
REM     rentUpsidePotential, modernizationBacklog, gegCompliant,
REM     commissionRate, commissionFree, buyerCommission,
REM     availableFrom, features[], highlights[], tenantCount,
REM     anchorTenant, tenantSectors[]
REM     +3 neue Enums: BuildingCondition, EnergyClass, EnergyCarrier
REM
REM   Backend:
REM     - POST/PATCH /me/listings akzeptieren alle neuen Felder
REM     - POST /me/seed-demo-listings legt 5 Beispiel-Inserate an
REM     - DELETE /me/seed-demo-listings entfernt sie wieder
REM
REM   Frontend:
REM     - Detail-Page komplett neu MFH-zentrisch:
REM       Vermietungs-Cockpit (Soll/Ist, WALT, Mietsteigerung),
REM       Investitions-Rechner (GrEStG nach Bundesland, Notar,
REM       Provision, Monatsrate), Bausubstanz-Block,
REM       Energieausweis (Klassen-Pill A+ bis H), Mieter-Mix,
REM       Sticky Sidebar mit Anbieter + USP-CTA
REM     - ListingCard: Energie-Pill, Einheiten-Counter,
REM       Off-Market/Vollvermietet-Badges
REM     - ListingEditor: 5 neue Sektionen (Bausubstanz,
REM       Einheiten+Energie, Vermietung, Mieter-Mix, Provision+Tags)
REM     - Demo-Seed-Button auf /marketplace und /listings (leer)
REM
REM   Wording:
REM     "Listing" -> "Inserat" in der UI
REM     (Sidebar: "Meine Inserate", "Inserat anlegen")
REM
REM   USP-Schaerfung (zusaetzlich):
REM     - Marketplace-Filter erweitert um Investor-Filter:
REM       Min. Bruttorendite, Min. WALT, Min. Energieklasse,
REM       Nur vollvermietet, Indexmiete, Anchor-Tenant,
REM       Off-Market, Modernisierungspotenzial
REM     - Hero-Quick-Presets jetzt USP-fokussiert:
REM       "Renditestark", "Off-Market Bestand",
REM       "Vollvermietet+Indexmiete", "Anchor-Tenant Gewerbe",
REM       "WALT 5+ Jahre", "Modernisierungschancen"
REM     - ListingCard Pills: Mietmultiplikator (X-fach),
REM       WALT-Pill (Y Jahre), Indexmiete-Indicator
REM     - ProfileMatchCard auf Detail-Seite:
REM       prueft Asset-Typ, Region, Ticket-Size, Bonitaet
REM       gegen das Investor-Profil und zeigt 4 Match-Indikatoren
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

git commit -m "feat: Inserat v2 - MFH/Gewerbe-USPs (Vermietungs-Cockpit, Investitions-Rechner, Energie, Demo-Seed)"
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
echo  Commit + Push erfolgreich.
echo  Vercel + Railway bauen automatisch (2-3 Minuten).
echo  Railway laeuft beim Deploy "prisma migrate deploy".
echo.
echo  Nach dem Build:
echo    1) https://infinityoikos.com/marketplace -^> "Beispiel-Inserate laden"
echo       klicken (legt 5 Demo-Inserate mit Bildern an)
echo    2) Eines anklicken -^> Detail-Seite mit allen Sektionen
echo       (Vermietungs-Cockpit, Investitions-Rechner, Energie, etc.)
echo    3) /listings -^> "Meine Inserate", Edit oeffnen -^>
echo       neue Form-Sektionen (Bausubstanz, Vermietung, ...)
echo ============================================================
echo.
pause
