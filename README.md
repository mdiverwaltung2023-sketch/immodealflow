# DealFlow AI (MVP)

Monorepo mit:

- `backend/`: Node.js + Express + Prisma + PostgreSQL (Railway)
- `frontend/`: Next.js 14 + Tailwind (Vercel)

Keine Auth im MVP. Fokus: End-to-End-Flow (Property → Analyse → Angebot via Claude).

---

## 📚 Wichtige Dokumente

| Datei                | Zweck                                                                |
|----------------------|----------------------------------------------------------------------|
| `project_state.md`   | **Aktueller Projektstand** — URLs, Architektur, To-Dos. Immer zuerst lesen. |
| `AGENTS.md`          | Verhaltensregeln für Software-Agenten (Claude, etc.)                 |
| `deploy/README.md`   | Schritt-für-Schritt-Anleitung für Setup, Deploy, Daily Use           |
| `deploy/*.bat`       | Skripte zum Doppelklicken (siehe `deploy/README.md`)                 |

---

## Schnellstart (mit BAT-Skripten)

Im Explorer den `deploy/`-Ordner öffnen und in dieser Reihenfolge doppelklicken:

1. **`01_setup-local.bat`** — npm install + git init + erster Commit
2. (manuell) GitHub-Repo `immodealflow` (privat) auf https://github.com/new anlegen
3. **`02_github-remote.bat`** — Repo verbinden + push
4. (manuell) Railway-Projekt + Postgres anlegen (Account: `mdiverwaltung.2023@gmail.com`)
5. (manuell) `backend/.env` und `frontend/.env.local` anhand der `.env.example`-Dateien füllen
6. **`03_db-migrate.bat`** — erste Prisma-Migration anwenden
7. **`04_dev-start.bat`** — lokal Backend + Frontend starten
8. (manuell) Vercel-Projekt anlegen — Root: `frontend/`

Detail-Anleitung mit jedem Klick und jeder ENV-Variable: **`deploy/README.md`**.

---

## Schnellstart (manuell, ohne BAT)

```bash
# 1) Dependencies
npm install

# 2) backend/.env aus backend/.env.example, frontend/.env.local aus frontend/.env.example
# DATABASE_URL und ANTHROPIC_API_KEY setzen

# 3) Prisma
npm run prisma:generate -w backend
cd backend && npx prisma migrate dev --name init && cd ..

# 4) Dev starten (Backend + Frontend gleichzeitig)
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend:  `http://localhost:4000/health`

---

## Deploy (Cloud)

### Backend → Railway

- `DATABASE_URL` (aus dem Postgres-Service im selben Projekt referenzieren)
- `ANTHROPIC_API_KEY` (Anthropic Console)
- `FRONTEND_ORIGIN` (Vercel-URL, kommagetrennt für Preview-Deploys)
- Build-Command: `npm install && npm run build -w backend && npx prisma generate --schema=backend/prisma/schema.prisma`
- Start-Command: `npm run start -w backend`

### Frontend → Vercel

- Root Directory: `frontend/`
- ENV: `NEXT_PUBLIC_API_BASE_URL` = Railway-Backend-URL
- Framework: Next.js (wird automatisch erkannt)

Vollständige Walkthroughs in `deploy/README.md`.

---

## Architektur in einem Bild

```
[Browser]
   │
   ▼
[Vercel]  ─────  Next.js 14 (frontend/)
                  │  fetch
                  ▼
[Railway]  ─────  Express 5 + Prisma (backend/)
                  │
                  ▼
[Railway]  ─────  PostgreSQL
```

Datenmodell, Endpunkte, offene Aufgaben → `project_state.md`.
