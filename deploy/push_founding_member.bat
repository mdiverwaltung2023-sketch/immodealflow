@echo off
REM Deploy: Oikos Investor Club - Gruendungsmitglied-Flag (User-Feld + Migration + /me + Badge)
cd /d "%~dp0\.."

if exist ".git\index.lock" del /F /Q ".git\index.lock"
echo === Projektordner: %CD% ===

git add backend/prisma/schema.prisma backend/prisma/migrations/20260622170000_founding_member/migration.sql backend/src/lib/auth.ts backend/src/lib/billing.ts backend/src/index.ts frontend/lib/api.ts frontend/app/profile/page.tsx
git commit -m "feat(oikos): Gruendungsmitglied-Flag + Gratis-Zugang - isFoundingMember, Auto-Vergabe bei Registrierung, effectivePlan (INVESTOR_FREE_PHASE + Gruender=INVESTOR_PRO gratis), /me, Badge (Migration 20260622170000)"
git push

echo.
echo == Push raus. Railway (Backend) migriert+deployt, Vercel (Frontend) baut neu. ==
echo Pruefen nach ~2-3 Min:
echo   - Neuer Investor registriert sich -> wird automatisch Gruendungsmitglied (#1, #2, ...)
echo   - Profilseite zeigt den goldenen "Gruendungsmitglied"-Badge
echo   - Abschaltbar: Railway-Var FOUNDING_MEMBER_OPEN=false (dann keine neuen Gruendungsmitglieder)
pause
