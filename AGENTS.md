# Agent-Verhalten — DealFlow AI (ImmoDealFlow)

Du arbeitest als autonomer Software-Agent am Projekt **DealFlow AI** —
einem MVP zur Analyse von Immobilien-Deals mit KI-gestützter Angebots­generierung.

> **Begleit-Dokument:** `project_state.md` enthält den aktuellen Projektstand
> (URLs, Architektur, offene Aufgaben). **Immer zuerst dort reinschauen**, bevor
> du mit Arbeit anfängst — nicht aus Erinnerung agieren.

## Grundprinzipien

- **End-to-end arbeiten** — nicht nach Teilschritten stoppen, bis das Ziel
  erreicht ist.
- **Eigenständig entscheiden** — keine Rückfragen für Trivialitäten; nur fragen,
  wenn ein echter Architektur-Trade-off ansteht oder Marcos Konto-/API-Keys
  betroffen sind.
- **Live testen** — nach jedem Deploy gegen die echte Backend-URL prüfen
  (Health + betroffener Endpoint). Niemals "Deploy läuft, sollte klappen".
- **Daten-Schutz** — `.env`-Dateien, API-Keys und `DATABASE_URL` werden NIE
  committet; sind in `.gitignore` ausgeschlossen.

## App-Zugang

Die URLs werden in `project_state.md` gepflegt — dort die aktuellen Werte
nachschlagen. Sobald deployt:

- **Backend (Railway):** `https://<service>.up.railway.app`
  - `GET /health` → `{"ok": true}` ← bestätigt Deploy
  - `GET /properties` → Liste aller Properties
- **Frontend (Vercel):** `https://<project>.vercel.app`

Solange noch nicht deployt: lokaler Smoke-Test über `04_dev-start.bat`,
URL `http://localhost:3000` (Frontend) und `http://localhost:4000/health`
(Backend).

## Deploy-Workflow

1. Code-Änderung lokal machen + bauen (`npm run build` falls relevant).
2. Lokal testen (`04_dev-start.bat`).
3. Commit + Push via `05_git-commit-push.bat` — **Railway und Vercel deployen
   automatisch** beim Push auf `main`.
4. Nach ~1–2 Minuten Health-Endpoint des Backends abrufen → Deploy bestätigen.
5. Den geänderten Endpoint/Flow in der Live-App testen.

## Diagnose bei Railway-Crashes

1. Railway-Logs lesen (Service → "Deployments" → "View Logs").
2. Bei Build-Fehler: lokal `npm run build -w backend` reproduzieren.
3. Bei Runtime-Fehler: `DATABASE_URL` in den Variables prüfen, Prisma-Migration
   ausgeführt? (`npm run prisma:migrate -w backend` zur Sicherheit).
4. Wenn Frontend rote Fehler-Seite: Browser-DevTools → Network → API-Call
   inspizieren. CORS-Problem? → Railway-Variable `FRONTEND_ORIGIN` muss
   die Vercel-URL enthalten (kommagetrennt für Preview-Deploys).
5. Neuen Commit pushen → frischer Deploy.

## Datei-Edits

**Edit-Tool ist OK** für TS/JS/JSON/MD-Dateien — wir haben keinen
Null-Byte-Bug wie bei Python im anderen Projekt. Bei großen Refactorings
trotzdem prüfen, ob ein vollständiges `Write` sauberer ist.

**Vor Commit immer:**
- `npm run lint` (im jeweiligen Workspace) durchlaufen lassen
- `npx tsc --noEmit` im backend für Typ-Check, im frontend reicht `next build`
  (zu schwergewichtig für jeden Edit, eher selektiv)

## BAT-Dateien kommunizieren

Wenn ich eine `.bat`-Datei in `deploy/` bereitstelle, **immer** exakt diese
Zeile zum User schreiben:

> Klicke folgende BAT: `DATEINAME.bat`

Niemals "View BAT", "Hier ist die Datei", "Doppelklick auf …",
`computer://`-Links ohne diese Einleitung. Immer dieselbe kurze Zeile.

## BAT-Datei-Konvention

- Liegen in `deploy/`, nicht im Root.
- Nummerierter Präfix (`01_…`, `02_…`) zeigt Reihenfolge.
- Erste Zeile `@echo off`, danach `cd /d "%~dp0\.."` (zum Projektroot wechseln,
  egal von wo gestartet).
- `pause` am Ende, damit Marco den Output lesen kann.
- Geheimnisse (API Keys, DB-URL) NIE in BAT — nur Hinweise auf `.env`.
- Idempotent halten (`if not exist .git git init`).
- Fehler abfangen mit `if errorlevel 1 …`.

## Railway- und Vercel-Änderungen

**Aktuell:** Marco klickt selbst in der Web-UI; ich begleite.

Wenn der Vercel-MCP-Connector aktiv ist (kann via Registry verbunden werden),
kann ich Deployments lesen/diagnostizieren — aber **nicht** Projekte erstellen.
Für Railway gibt es keinen MCP — Setup-Schritte (Service erstellen, Postgres
hinzufügen, Variables setzen) werden über die Web-UI von Marco erledigt,
ich liefere dazu klare Schritt-für-Schritt-Anleitungen in
`deploy/README.md`.

Falls in einer späteren Session der **"Claude in Chrome"-Browser** verfügbar
ist, kann ich Railway-Variables auch direkt via Browser-Automation anpassen
(Workflow analog zum Leadsystem-Projekt).

## Datenmodell und Endpunkte

Aktueller Stand siehe `project_state.md` (Single Source of Truth).
Wichtig:
- `Property` → `Analysis[]` (1:n, Snapshots), `Property` → `Offer?` (1:1),
  `Property` → `MarketComparison?` (1:1), `Property` → `AuctionInfo?` (1:1).
- **Multi-Tenant via `Property.ownerId` → `User.id`** (seit Push A2,
  2026-05-06). Auth läuft über Clerk: Frontend holt JWT,
  Backend verifiziert via `@clerk/backend` und provisioniert User
  Just-in-Time (`backend/src/lib/auth.ts`).

## Auth-Pfad (Pflichtlektüre vor jeder Backend-Änderung)

- Alle API-Routen außer `/health` sind durch `requireAuth` geschützt.
- Neue Routes IMMER mit Owner-Filter: `where: { id: req.params.id, ownerId: req.userId }`.
- CREATEs setzen `ownerId: req.userId`. Sonst Datenleck.
- Frontend-Server-Components lesen via `lib/api-server.ts` (top-level
  `import { auth } from "@clerk/nextjs/server"`, `import "server-only"`).
  **Kein dynamisches `await import()`** — bricht im Vercel-Build.
- Frontend-Client-Components nutzen `lib/client-fetch.ts` (`useApiFetch()` Hook).
- Bookmarklet-Receiver `/bookmarklet/receive` ist Server-Side-Proxy
  (Form-POST → Token-Forwarding ans Backend), umgeht Inserats-Site-CSP.

## Was nicht zu tun ist

- **Keine API-Keys hardcoden** — immer aus `process.env` lesen.
- **Keine `prisma migrate dev` in Production** — auf Railway nur `prisma migrate
  deploy` über den Build-/Start-Hook.
- **Nicht an `frontend/.next`, `node_modules` oder `dist` editieren** — sind
  Build-Artefakte.
- **Owner-Filter nicht vergessen** — siehe oben.

## Warte nicht auf Benutzerantworten

Wenn du gerade arbeitest, arbeite weiter, bis ein echter Block kommt
(fehlende API-URL, fehlender Key, Konflikt mit Marcos Account). Dann **gezielt**
fragen — nicht reflexartig.
