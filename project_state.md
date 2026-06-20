# PROJECT STATE — Infinity Oikos

> Marken-Name: **Infinity Oikos** (UI + Marketing).
> Repo-/Code-Pfad: `ImmoDealFlow` (intern; bleibt aus Pragmatismus erhalten).
> Frühere Arbeitsnamen: DealFlow AI, ImmoDealFlow.
>
> Stand: **2026-06-20** (Phase N — Oikos Capital Layer, Schritt 1: Financing Readiness).
> Diese Datei ist die Single Source of Truth für den aktuellen Projektstand.
> Bei jeder substanziellen Änderung (neuer Endpoint, neuer Deploy, neuer
> Bug, Status-Update) hier nachziehen.

---

## 🔑 WIE CLAUDE IN DIE APP KOMMT (IMMER ZUERST LESEN)

### URLs

| Service     | URL                                                                                | Status  |
|-------------|------------------------------------------------------------------------------------|---------|
| Frontend    | https://infinityoikos.com (Custom-Domain, seit 2026-05-20)                         | ✅ live |
| Frontend (Vercel-Default) | https://immodealflow-frontend.vercel.app                             | ✅ live |
| Backend     | https://dealflow-ai-backend-production.up.railway.app                              | ✅ live |
| Health      | https://dealflow-ai-backend-production.up.railway.app/health → `{"ok":true}`        | ✅      |
| GitHub-Repo | https://github.com/mdiverwaltung2023-sketch/immodealflow                           | ✅      |
| Auth        | Clerk (`pk_test_bGFzdGluZy1mbGFtaW5nby0xNS5jbGVyay5hY2NvdW50cy5kZXYk`)              | ✅ live |

### Lokaler Zugang

```
Backend:  http://localhost:4000  (Health: /health)
Frontend: http://localhost:3000
```

Start: `deploy\04_dev-start.bat` doppelklicken.

### Auth-Flow

Alle API-Routen außer `/health`, `/bookmarklet/*` und Public Pages (`/`, `/sign-in`,
`/sign-up`, `/bookmarklet`) sind durch Clerk geschützt:

1. Frontend holt JWT via `auth.getToken()` (Server) oder `useAuth().getToken()` (Client).
2. Token geht als `Authorization: Bearer …` an Backend.
3. Backend (`backend/src/lib/auth.ts`) verifiziert Token mit `@clerk/backend`,
   provisioniert User Just-in-Time (`User.clerkId` unique) und setzt `req.userId`.
4. Alle Routes filtern auf `where: { ownerId: req.userId }` — Multi-Tenant ab Tag 1.

### Test-Reihenfolge nach Deploy

1. **Health-Check:** `GET <backend>/health` → erwartet `{"ok":true}`.
2. **Auth-Probe:** Frontend `/dashboard` aufrufen — wenn nicht eingeloggt,
   Redirect auf Sign-in. Nach Login: Dashboard rendert eigene Properties.
3. **/me-Probe:** im Browser-Console `await fetch("/me", { headers })` →
   liefert `{ id, clerkId, email, name, role, legacyCount }`.
4. **Property-Detail:** Auction-Card (für ZVG), Analyse-Snapshot, Marktvergleich,
   Notes — alles mit Owner-Filter.
5. **Bookmarklet-Flow** (siehe `/bookmarklet`).

---

## Projekt

**DealFlow AI** — Tool zur Analyse von Immobilien-Deals (Investor-Perspektive)
mit langfristigem Ziel: **Two-Sided Marketplace MFH/Gewerbe**, in dem Verkäufer
das Investor-Profil (Trackrecord, Finanzierung) sehen können. Marco hat
Maklererlaubnis nach § 34c GewO. Aktueller Funktionsumfang abgeschlossen:

- Property-Pipeline (7 Status), Notes, Edit/Delete
- Mehrere Analyse-Snapshots pro Objekt mit Annahmen-Variation
- Claude-Tool-Use für Angebots-Generierung, Exposé-Import, Marktvergleich
- ZVG/DGA-Versteigerungen (Bietlimit-Berechnung, PDF/Text/URL-Import,
  Listen-Import, Universal-Bookmarklet)
- Auth + Multi-Tenant (Clerk + User-Modell + `ownerId`-Filter)

## Architektur

- **Frontend:** Next.js 14 (App Router) + React 18 + Tailwind 3 + Zod (`frontend/`)
- **Auth:** Clerk (`@clerk/nextjs` + `@clerk/backend`), `clerkMiddleware` schützt
  alle nicht-Public-Routen, JWT-Forwarding via `lib/api-server.ts` (Server-Components)
  und `lib/client-fetch.ts` (Client-Components)
- **Backend:** Node.js + Express 5 + Prisma 6 + Zod, TypeScript ESM (`backend/`)
- **DB:** PostgreSQL (Railway)
- **KI:** Anthropic API (`@anthropic-ai/sdk` 0.70), Modell `claude-sonnet-4-6`,
  Tool-Use überall (`callWithTool`)
- **Hosting:** Backend → Railway, Frontend → Vercel
- **Monorepo:** npm workspaces

## Datenmodell (Prisma)

Quelle: `backend/prisma/schema.prisma`. Aktuelle Migrationen siehe
`backend/prisma/migrations/`.

```
User { id, clerkId(unique), email, name?, role(UserRole),
       onboardingCompletedAt? }
   ├── Property[]         (1:n via ownerId, onDelete SetNull)
   ├── InvestorProfile?   (1:1, Bonität + Präferenzen + Sichtbarkeit)
   └── TrackrecordItem[]  (1:n, abgeschlossene Deals)

Property { id, title, price, rent, location, size, status(DealStatus),
           dealType(DealType), ownerId? }
   ├── Analysis[]         (1:n, Snapshots mit 9 Annahmen + 11 Outputs)
   ├── Offer?             (1:1, Claude-Vorschlag + Anschreiben)
   ├── Note[]             (1:n)
   ├── MarketComparison?  (1:1, Claude-Marktdaten + Rating)
   └── AuctionInfo?       (1:1, ZVG/DGA-Daten + Bietlimit)

InvestorProfile { userId(unique), bio, investmentExperienceYears,
                  equity?, monthlyIncome?, monthlyDebt?,
                  financingPreApproved, financingNote?,
                  preferredAssetTypes[], preferredRegions[],
                  minTicketSize?, maxTicketSize?,
                  visibility(ProfileVisibility) }

TrackrecordItem { userId, type(AssetType), year, value?, location,
                  role(TrackrecordRole), description?, verifiedBy? }

Listing { ownerId, title, description, propertyType(AssetType),
          status(ListingStatus), askingPrice, totalArea, totalRent?,
          city, postalCode?, district?, fullAddress?,
          anonymizationLevel(AnonymizationLevel) }
   ├── ListingImage[]   (1:n, url, alt?, sortOrder)
   └── Inquiry[]        (1:n)

Inquiry { listingId, investorId, status(InquiryStatus), message,
          response?, respondedAt? }
   ├── listing  (Listing)
   ├── investor (User, via @relation "InvestorInquiries")
   └── ratings  (Rating[], 0–2 pro Inquiry — eine pro Richtung)

Rating { inquiryId, fromUserId, toUserId, direction(RatingDirection),
         stars(1..5), body, rebuttal?, rebuttalAt? }
   └── @@unique [inquiryId, direction]  (max 1 Rating pro Richtung)
```

Enums: `UserRole {INVESTOR, SELLER, BOTH}`, `DealStatus {WATCHING, INQUIRED,
NEGOTIATING, LOI, NOTAR, CLOSED, REJECTED}`, `DealType {FREE_SALE, AUCTION}`,
`AuctionType {ZVG, DGA, SDL, KARHAUSEN, OTHER}`, `MarketRating {below_market,
fair, above_market}`, `AssetType {MFH, COMMERCIAL, MIXED_USE, SINGLE_FAMILY,
APARTMENT, LAND, OTHER}`, `ProfileVisibility {PRIVATE, ON_REQUEST, PUBLIC}`,
`TrackrecordRole {BUYER, SELLER, PARTNER, BROKER, OTHER}`,
`ListingStatus {DRAFT, ACTIVE, IN_NEGOTIATION, SOLD, ARCHIVED}`,
`AnonymizationLevel {FULL_ADDRESS, DISTRICT_ONLY, CITY_ONLY}`,
`InquiryStatus {PENDING, ACCEPTED, REJECTED, WITHDRAWN}`,
`RatingDirection {INVESTOR_TO_SELLER, SELLER_TO_INVESTOR}`.

## Backend-Endpunkte

Public (kein Auth):

| Methode | Pfad                  | Zweck                                          |
|---------|-----------------------|------------------------------------------------|
| GET     | `/health`             | Healthcheck                                    |

Auth-geschützt (`requireAuth`):

| Methode | Pfad                              | Zweck                                                  |
|---------|-----------------------------------|--------------------------------------------------------|
| GET     | `/properties/:id/financing-readiness` | **Phase N** — Bankfaehigkeits-Ampel (live aus Property + Investor-Profil + letzter Analyse; keine DB-Tabelle, keine Vermittlung) |
| GET     | `/me/financing/overview`          | **Phase N** — Capital-Layer-Cockpit: alle eigenen Objekte mit Ampel + Aggregat (gruen/gelb/rot) |
| POST    | `/properties/:id/financing-requests` | **Phase O** — Finanzierungsanfrage anlegen (Snapshot der Ampel) |
| GET     | `/me/financing-requests`          | **Phase O** — alle eigenen Finanzierungsanfragen (Cockpit-Liste) |
| PATCH   | `/me/financing-requests/:id`      | **Phase O** — Status / Notiz / Volumen aktualisieren |
| DELETE  | `/me/financing-requests/:id`      | **Phase O** — Finanzierungsanfrage loeschen |
| GET     | `/me`                             | Aktueller User + `onboardingCompletedAt` + `legacyCount` |
| PATCH   | `/me`                             | Felder updaten (Name, Rolle)                           |
| POST    | `/me/complete-onboarding`         | Onboarding-Timestamp setzen (optional Rolle/Name mit)  |
| POST    | `/me/claim-legacy`                | Übernimmt alle ownerId=null Properties auf den User    |
| GET     | `/me/profile`                     | Investor-Profil (legt leeres bei Bedarf an, mit Bonität-Calc + Trackrecord) |
| PATCH   | `/me/profile`                     | Profil-Felder upserten (alle optional)                 |
| POST    | `/me/trackrecord`                 | Trackrecord-Eintrag anlegen                            |
| DELETE  | `/me/trackrecord/:id`             | Eigenen Trackrecord-Eintrag löschen                    |
| GET     | `/me/listings`                    | Eigene Listings (alle Status, optional `?status=` Filter) |
| POST    | `/me/listings`                    | Neues Listing (DRAFT)                                  |
| GET     | `/me/listings/:id`                | Eigenes Listing-Detail (alle Felder)                   |
| PATCH   | `/me/listings/:id`                | Listing-Felder updaten (inkl. Status, Anonymisierung)  |
| DELETE  | `/me/listings/:id`                | Listing samt Bildern löschen                           |
| POST    | `/me/listings/:id/images`         | Bild-URL anhängen (Frontend hat schon hochgeladen)     |
| DELETE  | `/me/listings/:listingId/images/:imageId` | Bild entfernen                                 |
| PATCH   | `/me/listings/:id/images/reorder` | Bild-Reihenfolge neu setzen (`{orderedIds: string[]}`); erstes Bild = Cover |
| GET     | `/marketplace`                    | Aktive Listings, anonymisiert; Filter `?city=&type=&priceMin=&priceMax=&areaMin=` |
| GET     | `/marketplace/:id`                | Listing-Detail, anonymisiert + `myInquiry` + `isOwner` |
| POST    | `/me/inquiries`                   | Investor stellt Anfrage (body: listingId, message)     |
| GET     | `/me/inquiries`                   | Eigene gesendete Anfragen (Investor-Sicht)             |
| GET     | `/me/inquiries/:id`               | Eigene Anfrage-Detail (bei ACCEPTED: fullAddress + Verkäufer-Email freigegeben) |
| DELETE  | `/me/inquiries/:id`               | Anfrage zurückziehen (nur PENDING → WITHDRAWN)         |
| GET     | `/me/listings/:id/inquiries`      | Anfragen auf eigenem Listing inkl. Investor-Profil-Auszug + Rating-Summary (Verkäufer-Sicht) |
| PATCH   | `/me/inquiries/:id/respond`       | Verkäufer accept/reject; bei ACCEPT: Listing → IN_NEGOTIATION |
| POST    | `/me/ratings`                     | Bewertung abgeben (nur wenn Listing SOLD + Inquiry ACCEPTED, eigene Seite) |
| GET     | `/me/ratings/given`               | Eigene abgegebene Bewertungen                          |
| GET     | `/me/ratings/received`            | Erhaltene Bewertungen + Aggregations-Summary           |
| POST    | `/me/ratings/:id/rebuttal`        | Gegendarstellung (nur Bewerteter, einmalig)            |
| GET     | `/users/:id/ratings`              | Public Ratings + Summary (geschützt, eingeloggte User) |
| GET     | `/properties`                     | Liste eigener Properties (mit `?status=` Filter)       |
| POST    | `/properties`                     | Property anlegen (Zod-validiert), `ownerId=req.userId` |
| GET     | `/properties/:id`                 | Detail (eigene), inkl. Auction/Analyse/Markt/Offer/Notes |
| PATCH   | `/properties/:id`                 | Felder updaten                                         |
| DELETE  | `/properties/:id`                 | Property löschen                                       |
| POST    | `/properties/:id/notes`           | Notiz anlegen                                          |
| DELETE  | `/notes/:noteId`                  | Notiz löschen                                          |
| POST    | `/analyze/:id`                    | Neuer Analyse-Snapshot (optionale Annahmen)            |
| DELETE  | `/analyses/:id`                   | Analyse-Snapshot löschen                               |
| POST    | `/offer/:id`                      | Claude-Tool-Use `propose_offer` → `Offer` upsert       |
| POST    | `/properties/:id/market-comparison` | Claude-Tool-Use `market_comparison` → upsert         |
| POST    | `/properties/:id/recompute-bid-limit` | Bietlimit per Bisektion neu berechnen              |
| POST    | `/import/expose`                  | Claude-Tool-Use `extract_property` (Text → Felder)     |
| POST    | `/import/auction`                 | ZVG-Import (Body `{text}`/`{pdfBase64}`/`{url}`)       |
| POST    | `/import/auction-list`            | Listen-Import (Body `{url}` oder `{text}`)             |

Quelle: `backend/src/index.ts`, `backend/src/lib/auth.ts`.

## Frontend-Routen

Public (Clerk-Middleware lässt durch):

| Pfad                  | Zweck                                                  |
|-----------------------|--------------------------------------------------------|
| `/`                   | Landing für nicht-eingeloggte User                     |
| `/sign-in`, `/sign-up`| Clerk-Auth-Pages                                       |
| `/bookmarklet`        | Anleitung + Drag-to-Bookmarks                          |
| `/bookmarklet/receive`| POST-Empfänger (server-to-server an Backend)           |

Geschützt (Login erforderlich, `requireOnboardedUser()`-Guard):

| Pfad                       | Zweck                                                  |
|----------------------------|--------------------------------------------------------|
| `/onboarding`              | Rollen-Auswahl beim ersten Login (INVESTOR/SELLER/BOTH); kein Guard, sonst Loop |
| `/dashboard`               | Eigene Properties, Status-Filter, Score, Claim-Banner  |
| `/new`                     | Neue Property + Schnell-Import-Card                    |
| `/property/[id]`           | Detail (Auction/Analyse/Markt/Offer/Notes)             |
| `/property/[id]/edit`      | Edit-Form                                              |
| `/profile`                 | Investor-Profil + Trackrecord                          |
| `/listings`                | Eigene Listings (Verkäufer-Sicht, Status-Übersicht)    |
| `/listings/new`            | Neues Listing als Entwurf                              |
| `/listings/[id]/edit`      | Listing bearbeiten + Bilder + Anonymisierung + Status; Link auf Anfragen |
| `/listings/[id]/inquiries` | Anfragen auf eigenem Listing mit Investor-Profil-Karten + Accept/Reject |
| `/marketplace`             | Öffentliche Suchseite mit Filtern, anonymisierte Karten |
| `/marketplace/[id]`        | Listing-Detail (anonymisierte Lage) + "Anfrage stellen"-Card |
| `/inquiries`               | Meine Anfragen (Investor-Sicht, Status + Listing-Vorschau) |
| `/inquiries/[id]`          | Anfrage-Detail; bei ACCEPTED: fullAddress + Verkäufer-Email |
| `/auctions`                | Versteigerungs-Liste sortiert nach Termin              |
| `/auctions/import`         | 4 Tabs (Text/PDF/URL/Liste)                            |
| `/api/upload-image` (POST) | Frontend-Route Handler — lädt File zu Vercel Blob hoch (Auth via Clerk, ENV `BLOB_READ_WRITE_TOKEN`); 503 wenn Blob nicht aktiviert |

Guard-Mechanik: `requireOnboardedUser()` in `lib/api-server.ts` ruft `/me` ab,
redirected auf `/onboarding`, wenn `onboardingCompletedAt == null`. Eingebaut
in: `dashboard/page.tsx`, `new/page.tsx` (via Wrapper), `property/[id]/page.tsx`,
`property/[id]/edit/page.tsx`, `profile/page.tsx`, `auctions/layout.tsx` (deckt
beide Auctions-Pages ab). NICHT in `/onboarding` selbst (Loop).

Server-Components nutzen `lib/api-server.ts` mit `import "server-only"` und
top-level `import { auth } from "@clerk/nextjs/server"`. Client-Components
nutzen `lib/client-fetch.ts` mit `useApiFetch()` Hook.

## Aktuelle Phase: **Phase N — Oikos Capital Layer, Schritt 1: Financing Readiness (2026-06-20)**

### Phase N (2026-06-20) — Oikos Capital Layer, Schritt 1: Financing-Readiness-Ampel

> Erster Baustein der neuen Finanzierungsschicht („Oikos Capital Layer").
> Vollkonzept: `Oikos_Capital_Layer_Konzept.docx` (Vision, Module, Regulatorik,
> MVP-Roadmap). Dieser Schritt liefert das MVP-Kernstück: eine live berechnete
> Bankfaehigkeits-Ampel auf der Property-Detailseite.

**Regulatorik (bewusst erlaubnisfrei):** Reine Selbsteinschaetzung der
allgemeinen Bankfaehigkeit aus vorhandenen Daten — KEINE Finanzierungs-
beratung, keine Produktempfehlung, keine Vermittlung (kein § 34i/§ 34c GewO).
Disclaimer wird vom Backend mitgeliefert und im UI angezeigt. Die spaetere
Vermittlung/Beratung bleibt lizenzierten Partnern vorbehalten.

**Backend**
- `backend/src/lib/financing.ts` — `computeFinancingReadiness(price, rent, profile, storedAnalysis?)`.
  Fuenf Kriterien je GREEN/YELLOW/RED: Eigenkapitalquote, Kapitaldienstdeckung
  (DSCR), Bonitaet/Selbstauskunft, Beleihungsauslauf (LTV), Objekt-Score.
  Gesamt-Ampel: Kern-Kriterien (EK/DSCR/Bonitaet/LTV) entscheiden ueber ROT;
  sonst schlechteste Ampel. Liefert `readinessScore` (0–100), Massnahmenliste
  und Disclaimer. Reuse von `lib/calc.ts` (computeFullAnalysis) und der
  Affordability-Faustformel (40 % Einkommen, 5,8 % Annuitaet).
- `GET /properties/:id/financing-readiness` (index.ts, Owner-Filter, laedt
  InvestorProfile + letzte Analyse). Keine DB-Migration — live berechnet.

**Frontend**
- `frontend/lib/api.ts` — `FinancingReadinessSchema` + Typen (`Light`, Kriterien).
- `frontend/app/property/[id]/FinancingReadinessPanel.tsx` — Client-Component,
  laedt die Ampel via `useApiFetch`, rendert Gesamt-Ampel, Kriterien-Tabelle,
  Massnahmen, Disclaimer; Hinweis + Link auf `/profile`, falls kein Profil.
- `frontend/app/property/[id]/page.tsx` — neue Card „Finanzierungs-Ampel
  (Oikos Capital Layer)".

**Status / Verifikation**
- ✅ Frontend `tsc --noEmit` sauber. ✅ Backend `tsc --noEmit` sauber bzgl. der
  neuen Dateien (die einzigen offenen TS-Fehler betreffen einen veralteten
  generierten Prisma-Client — `SaleDocKind`-Enumwerte; vor dem Build lokal
  `npm run prisma:generate -w backend` ausfuehren, siehe `deploy/verify.bat`).
- ⚠️ Naechste Capital-Layer-Schritte (laut Konzept): One-Click Financing
  Package (PDF), Dokumenten-Checkliste, Banken-Matching (erst nach
  aufsichtsrechtlicher Pruefung), Finanzierungsagent.

### Phase M5.1 (2026-05-20) — Bild-Reihenfolge per Drag-and-Drop (Kanban)

> Wunsch von Marco direkt nach Phase M5: "Noch besser waere es wenn man
> die Bilder in der Uebersicht mit Bild druecken und halten verschieben
> koennte, Kanban-Style."

- ✅ **Backend `PATCH /me/listings/:id/images/reorder`** — Body
  `{orderedIds: string[]}`. Validiert Set-Gleichheit gegen bestehende
  ImageIDs (kein Reinschmuggeln fremder IDs, keine Duplikate, keine
  fehlenden), dann `prisma.$transaction` mit `update`-Statements,
  die `sortOrder = 0..N-1` setzen. Liefert die aktualisierte Liste
  zurueck.
- ✅ **Frontend `SortableImageCard`** in `ListingEditor.tsx` —
  basiert auf `@dnd-kit/sortable` (+ `@dnd-kit/core`, `@dnd-kit/utilities`).
  Drei Sensoren mit Activation-Constraints:
  - **PointerSensor** (Maus/Stylus): Drag startet erst nach 8 px Bewegung
    — schuetzt vor versehentlichem Drag beim normalen Klicken.
  - **TouchSensor**: Drag startet nach 200 ms Druecken + 5 px Toleranz —
    klassisches "Press-and-Hold-and-Drag" Kanban-Pattern. Marco kann
    am Smartphone kurz draufdruecken und dann ziehen.
  - **KeyboardSensor**: Pfeiltasten + Space fuer Accessibility.
- ✅ **UX:**
  - Cover-Badge auf Position 0 (Indigo, links oben).
  - Hover-Hinweis "Ziehen" unten links.
  - Cursor-grab im Idle, grabbing waehrend Drag.
  - Optimistic UI: Marco sieht die neue Reihenfolge sofort; Backend
    wird im Hintergrund nachgezogen; Rollback bei Fehler.
  - Loeschen-Button macht `e.stopPropagation()` + `onPointerDown` stop
    — damit der Click NICHT als Drag-Start interpretiert wird.
  - `touch-none select-none` auf der Karte verhindert Browser-Default-
    Scroll auf Touch-Geraeten waehrend des Drags.
- ✅ **3 neue npm-Deps:** `@dnd-kit/core` ^6.3.1,
  `@dnd-kit/sortable` ^10.0.0, `@dnd-kit/utilities` ^3.2.2 (zusammen
  ~25 kB gzipped, Industrie-Standard fuer React-DnD, voll Touch-tauglich).
- ✅ **BAT:** `110_image-reorder.bat` (npm install + Backend tsc +
  Frontend build + commit + push).
- ⚠️ Keine Schema-/Migration-Aenderung — `sortOrder` existierte schon
  am `ListingImage`-Modell.

### Phase M5 (2026-05-20) — Hotfix Bilder-Upload + Listing-Dedup

> Ausloeser: Marco hat heute ein Inserat angelegt und folgendes erlebt:
> (a) das Inserat wurde versehentlich doppelt angelegt, (b) Bilder-Upload
> war einzeln-only, sehr langsam und der zweite Versuch endete in HTTP 413
> ("Upload fehlgeschlagen").

**Bug 1 — Doppeleingabe bei Listing-Create**

- Ursache: `disabled={busy}` am Submit-Button greift erst nach dem React-
  Re-Render. Ein zweiter Klick (Doppelklick, Enter-Taste, Mobile
  Double-Tap) rutscht durch das Race-Window und triggert einen zweiten
  `POST /me/listings`. Backend hatte keinerlei Dedup.
- Fix Backend (`backend/src/index.ts`): 60-Sek-Dedup-Window in
  `POST /me/listings` — wenn derselbe Owner in den letzten 60 Sek ein
  Listing mit identischem Title + askingPrice + totalArea angelegt hat,
  geben wir das bestehende zurueck statt ein zweites zu erzeugen.
- Fix Frontend (`NewListingForm.tsx`, `ListingEditor.tsx`): synchroner
  `useRef`-Guard zusaetzlich zum `useState`-Busy-Flag. Damit faengt der
  Client das Race-Window vor dem fetch ab; Backend-Dedup ist Belt +
  Suspenders.

**Bug 2 — Bilder-Upload langsam, Single-File-only, 413 bei Smartphone-Fotos**

- Ursache: alte Route `/api/upload-image` machte Server-Side-Upload
  durch eine Vercel-Function. Damit: (a) hartes 4-MB-Body-Limit (typische
  iPhone/Android-Fotos sind 4-8 MB → 413), (b) Doppel-Hop Browser →
  Function → Blob = langsam, (c) `<input>` hatte kein `multiple`.
- Fix neue Route (`frontend/app/api/blob-upload/route.ts`): Token-Handler
  fuer `@vercel/blob/client` `upload()` mittels `handleUpload()`.
  Validiert Clerk-Auth, beschraenkt Pfad-Prefix auf `listings/<userId>/`,
  signiert 60-Sek-gueltige Upload-Tokens. Datei laeuft NICHT mehr durch
  die Function — Browser spricht direkt mit Blob-Store. Bis 25 MB pro
  File, kein 4-MB-Function-Limit.
- Fix Helper (`frontend/lib/upload-image.ts`): client-seitige Compression
  via Canvas (max 2560 px lange Kante, JPEG q=0.85) — drueckt typische
  Smartphone-Fotos von 4-8 MB auf 300-700 KB ohne sichtbaren
  Qualitaetsverlust. Wenn Komprimierung nicht spart (bereits kleine
  Bilder), wird das Original verwendet. Danach `upload()` aus
  `@vercel/blob/client` mit `onUploadProgress`-Callback fuer die UI.
- Fix UI (`ListingEditor.tsx` → `ImageUploadSection`):
  - `multiple`-Attribut + Drag-and-Drop-Zone
  - parallele Uploads (Promise.all)
  - Pro-File-Status (Komprimiere / Uploadest XX% / Speichere / Fertig /
    Fehler) mit Progressbar
  - Funktional-Form von `setImages` als `onChange` — schliesst
    stale-closure-Bug bei parallelen Uploads
  - Erfolgreiche Items verschwinden nach 4 s; Fehler-Items bleiben mit
    Schliessen-Button
- Alte Route `/api/upload-image` bleibt vorerst als Fallback fuer
  Offmarket-, Rental- und Tenant-Profil-Bilder (Migration spaeter).
- BAT: `109_fix-listing-dup-and-uploads.bat` macht lokalen Build
  (Backend tsc + Frontend next build), committet und pusht.

**Marco-Schritt:** Doppel-Inserat von heute manuell ueber `/listings`
loeschen (das bleibt liegen — der Fix verhindert nur kuenftige Duplikate).
Bei kuenftigen Uploads: Drag-and-Drop von mehreren Bildern in die
gestrichelte Zone, oder Klick → System-Dialog mit Multi-Select.

### Phase M4 (2026-05-19) — Verkaufsabwicklung 2.0, Schritt 4

> Aufbauend auf M3: Marco hatte den BuyerAccessManager auf der Listing-
> Edit-Seite nicht gefunden (sechs Karten weit unten). Plus: Investoren
> mit Account sollen die Unterlagen direkt in der App sehen, nicht nur
> via Token-Link.

- ✅ **Backend `GET /me/buyer-access`** — globale Liste aller eigenen
  Freigaben ueber alle Inserate, mit eingebetteter Listing-Info.
  `?activeOnly=true` filtert Widerrufen/Abgelaufen aus.
- ✅ **Backend `GET /me/buyer-access-received`** — Investor-Sicht:
  alle Freigaben in denen ich `buyerUserId` bin (nicht widerrufen, nicht
  abgelaufen). Liefert Listing-Header + freigegebene Dokumente direkt.
- ✅ **Auto-Bind im Public-Endpoint**: wenn ein eingeloggter Investor
  einen Token-Link oeffnet, wird `buyerUserId` automatisch gesetzt
  (sofern noch leer). Damit taucht die Freigabe ab dem zweiten Aufruf
  direkt unter „Erhaltene Unterlagen" in der App-Shell auf. Clerk-
  Token wird via `verifyToken()` aus dem Authorization-Header gelesen,
  Fehler stillschweigend ignoriert (Public-Endpoint bleibt funktional).
- ✅ **Frontend `BuyerAccessManager`** zusaetzlich auf `/sales/[id]`
  eingebunden — Dokumente hochladen und freigeben in derselben Ansicht.
- ✅ **Page `/freigaben`** mit Filter (Alle/Aktiv/Widerrufen+Abgelaufen),
  Liste aller Freigaben ueber alle Inserate, Klick fuehrt zurueck zum
  Inserat.
- ✅ **Page `/empfangene-freigaben`** (Investor): Inline-Sicht aller
  empfangenen Freigaben mit Listing-Header, direkten Download-Links
  zu den Dokumenten und Marketplace-Deep-Link. Keine Token-URL noetig.
- ✅ **Sidebar erweitert:**
  - `SECTION_SELLER` bekommt `Dokumenten-Freigaben` → `/freigaben`
  - `SECTION_INVESTOR` bekommt `Erhaltene Unterlagen` → `/empfangene-freigaben`
- ✅ **Dashboard-Card** `BuyerAccessDashboardCard`: 5 letzte aktive
  Freigaben auf `SellerView`, mit Direkt-Link auf `/freigaben`.
- ✅ **Schemas** in `frontend/lib/api.ts`:
  `BuyerDocAccessWithListingSchema`, `ReceivedBuyerAccessSchema`.
- ✅ **BATs:** `107_phase-m4-build.bat`, `108_commit-phase-m4.bat`.
- ⚠️ Keine Schema-/Migration-Aenderung — reines Feature-Add oben auf
  dem M1-Datenmodell. `npm run build` reicht.

### Phase M3 (2026-05-19) — Verkaufsabwicklung 2.0, Schritt 3

> Aufbauend auf M2: Notification-Pfad, Inquiry-Auto-Fill und visuelle
> Aufwertung der Pipeline. Zusatz-Wunsch von Marco: bunte Icons pro
> Stage im horizontalen Stepper.

- ✅ **Prisma:** Modell `UserNotification` (kind, title, body, link,
  payloadJson, readAt) + Enum `UserNotificationKind` (4 Werte). Migration
  `20260519180000_notifications_m3`. Indizes auf `(userId, readAt,
  createdAt)` und `(userId, kind)`.
- ✅ **Backend-Hook:** `GET /public/buyer-access/:token` legt beim ersten
  Abruf (`wasFirstAccess = accessCount === 0`) eine
  `FIRST_BUYER_ACCESS`-Notification fuer den Verkaeufer an. Fire-and-
  forget — ein Notify-Fehler darf den Public-Endpoint nie blockieren.
- ✅ **Notification-Endpoints:**
  - `GET /me/notifications?unreadOnly&limit` (default 50, max 200,
    Antwort: `{ items, unreadCount }`)
  - `PATCH /me/notifications/:id` — idempotent als gelesen markieren
  - `POST /me/notifications/mark-all-read`
- ✅ **Inquiry-Auto-Fill:** `POST /me/listings/:listingId/buyer-access`
  akzeptiert optional `inquiryId` und befuellt `buyerLabel`/`buyerEmail`
  aus dem Investor-Profil der Inquiry, wenn die Felder nicht explizit
  mitgegeben wurden. Verkaeufer wird im Modal um den Inquiry-Bezug
  gefragt (Dropdown).
- ✅ **Frontend `NotificationBell`-Komponente:** sitzt im TopBar,
  pollt alle 30 s `/me/notifications?unreadOnly=true&limit=1`, zeigt
  roten Badge mit Unread-Count, klick fuehrt auf `/benachrichtigungen`.
- ✅ **Page `/benachrichtigungen`:** Liste der letzten 100
  Notifications mit Read/Unread-State, „Alle als gelesen markieren"-
  Button, Deep-Link auf den Original-Kontext (z.B. zurueck zum
  Listing-Edit).
- ✅ **`BuyerAccessManager`-Modal**: neuer Dropdown „Aus Anfrage
  uebernehmen". Wenn ausgewaehlt, werden Buyer-Label und Email
  automatisch aus dem Investor-Profil gefuellt (Werte ueberschreibbar).
- ✅ **Bunte Pipeline-Icons** (Wunsch von Marco):
  `components/SaleStageVisual.tsx` mit 13 Inline-SVG-Icons (Handshake,
  Eye, Chat, Lock, Document-Edit, Calendar, Stamp, Shield-Check,
  Euro-Banknote, Key, Certificate, Trophy, X-Circle) und einer
  Farbpalette `SALE_STAGE_TONES` von Indigo (Anfang) ueber Gelb
  (Kaufpreis) bis Rose (Abgeschlossen), Zinc fuer Abgebrochen.
  Genutzt im horizontalen Stepper auf `/sales/[id]` (44px-Knoten mit
  Icon, Done-Tick-Overlay), in der Mobile-Liste und in der Werbe-Sicht
  des `StartSaleProcessButton` (farbige Pillen mit Icon).
- ✅ **BATs:** `105_phase-m3-migrate.bat` (Lockfile + prisma generate +
  migrate dev + frontend build), `106_commit-phase-m3.bat`.

### Phase M2 (2026-05-19) — Verkaufsabwicklung 2.0, Schritt 2

> Aufbauend auf M1: jetzt das UI fuer den Verkaeufer (Freigaben pflegen)
> und die Kaeufer-Sicht als Public-Page. Plus grafische horizontale
> Pipeline im Sales-Detail.

- ✅ **Frontend `BuyerAccessManager.tsx`** auf `/listings/[id]/edit`:
  Card zeigt alle Freigaben des Inserats mit Status (Aktiv / Widerrufen
  / Abgelaufen), `accessCount`, `lastAccessedAt`, freigegebenen
  Kategorien als Chips und einem kopierbaren Link. Aktionen: Link kopieren,
  Widerrufen, Reaktivieren, Loeschen.
- ✅ **Create-Modal** mit Multi-Checkbox ueber alle 14 `SaleDocKind`-
  Kategorien (Alle/Keine-Shortcut), Buyer-Label, Buyer-Email, Ablauf in
  Tagen, interne Notiz. Erfolgs-Sicht zeigt Token-Link direkt mit
  Copy-Button + Vorschau-Link.
- ✅ **Public-Page `/zugang/[token]`** (`frontend/app/zugang/[token]/page.tsx`):
  Server-Component, kein Clerk-Auth, fetcht
  `GET /public/buyer-access/:token` und zeigt Listing-Header (anonymisiert
  je nach `anonymizationLevel`), Liste freigegebener Dokumente mit
  direkten Download-Links und Hinweis auf freigegebene-aber-noch-nicht-
  hochgeladene Kategorien. Bei revoked/expired/unbekannt freundlicher
  404-Hinweis.
- ✅ **Middleware + ConditionalShell** erweitert: `/zugang(.*)` ist
  jetzt public (kein Clerk-Schutz) und nutzt das Marketing-Layout
  (kein Sidebar).
- ✅ **Horizontaler Pipeline-Stepper** auf `/sales/[id]`:
  Desktop-Ansicht zeigt jetzt 13 Stationen in einer horizontalen
  Reihe mit gruenen Connector-Linien zwischen erledigten Stationen,
  Knoten als runde 36-px-Badges mit Ring-Highlight fuer Current/Done.
  Mobile bleibt bei der bewaehrten Karten-Liste (Auto-Switch via
  `md:`-Breakpoint).
- ✅ **BATs:** `103_phase-m2-buyer-access-ui.bat` (Lockfile + Lint /
  Type-Check), `104_commit-phase-m2.bat` (git commit/push).
- ⚠️ Keine Schema-/Migration-Aenderung — reines Frontend-Feature
  oben auf dem M1-Datenmodell.
- ⚠️ Phase M3 ausstehend (optional): Auto-SaleProcess bei erstem
  Doc-Upload, In-App-Notification beim ersten Token-Abruf,
  Auto-Fill der Freigabe aus Inquiry-Kontext.

### Phase M1 (2026-05-19) — Verkaufsabwicklung 2.0, Schritt 1

> Ausloeser: Marco moechte die Verkaufsabwicklung als Werbemittel
> transparent VOR der Kaufpreis-Eingabe zeigen, die Pipeline grafisch
> als Stepper darstellen und einen Mechanismus haben, mit dem
> Dokumente an einen konkreten Kaufinteressenten freigegeben werden
> koennen — auch ohne Marketplace-Inquiry und ohne Account.
>
> Vollkonzept inkl. Phasenplan: `phase_M_concept.md` im Repo-Root.

- ✅ **Prisma:** neues Modell `BuyerDocAccess` (Token-basierte
  Dokumenten-Freigabe pro Listing). Felder: `token` (unique, 256 bit
  hex), `allowedDocKinds: SaleDocKind[]`, `expiresAt?`, `revokedAt?`,
  `accessCount`, `lastAccessedAt`, `buyerLabel?`, `buyerEmail?`,
  `inquiryId?`, `buyerUserId?`. Migration
  `20260519120000_buyer_doc_access_m1`. User-Relations
  `BuyerAccessSeller` und `BuyerAccessBuyer` hinzugefuegt, Listing
  und Inquiry haben jeweils ein neues Inverse-Field.
- ✅ **Backend Endpoints:**
  - `GET /me/listings/:listingId/buyer-access` — Liste aller Freigaben
  - `POST /me/listings/:listingId/buyer-access` — Freigabe erstellen
    (Body: `allowedDocKinds[]`, optional `buyerLabel`, `buyerEmail`,
    `inquiryId`, `expiresAt`, `notes`)
  - `PATCH /me/buyer-access/:id` — aktualisieren / widerrufen / unrevoken
  - `DELETE /me/buyer-access/:id` — hart loeschen
  - `GET /public/buyer-access/:token` — Kaeufer-Sicht **ohne Auth**;
    gibt anonymisiertes Listing + freigegebene Dokumente zurueck;
    erhoeht `accessCount` + `lastAccessedAt`; antwortet 404 bei
    `revokedAt`/`expiresAt` ueberschritten / unbekannt.
- ✅ **UI-Entkopplung von Kaufpreis:** `StartSaleProcessButton.tsx`
  zeigt jetzt eine *Werbe-Sicht* mit Pipeline-Preview (13 Stationen
  als horizontale Chips) und einer Liste aller 14 Dokumenten-Slots —
  schon BEVOR die Pipeline gestartet wurde. Klick auf "Verkaufsabwicklung
  starten" legt direkt einen `SaleProcess` an (ohne Modal, ohne
  Kaufpreis-Pflichtfeld) und navigiert auf `/sales/:id`. Preis +
  Notizen pflegt der Verkaeufer dort weiterhin ueber `ProcessFields`.
- ✅ **Frontend-Schemas:** `BuyerDocAccessSchema`,
  `BuyerDocAccessListSchema`, `PublicBuyerAccessSchema` in
  `frontend/lib/api.ts`. Noch keine UI-Komponenten — folgen in M2.
- ✅ **BATs:** `101_phase-m1-buyer-doc-access.bat` (Lockfile-Sync +
  Prisma generate + Migration + Status), `102_commit-phase-m1.bat`
  (git commit/push).
- ⚠️ **Phase M2 ausstehend:** Tab "Verkaufsabwicklung" pro Inserat im
  Verkaeufer-Edit; UI fuer Freigabe-Erstellung (Modal mit Checkboxen
  pro Doc-Kind, Ablauf, Buyer-Label); Public-Route `/zugang/[token]`;
  optional grafische Pipeline-Darstellung statt Grid in `/sales/[id]`.
- ⚠️ **Phase M3 ausstehend (optional):** Auto-SaleProcess bei erstem
  Dokumenten-Upload, Notification bei erstem Token-Abruf, Auto-Fill
  von Freigaben aus Inquiry-Kontext.

### Phase F (2026-05-17) — Offmarket-Layer (additives Zusatzfeature)

### Phase F (2026-05-17) — Offmarket-Layer (additives Zusatzfeature) [zuvor aktuell]

**Konzept:** Eigener Bereich `Offmarket` parallel zum bestehenden
Marketplace. Eigentuemer legen diskrete Offmarket-Inserate an, die
**nie** im oeffentlichen `/marketplace` erscheinen. Sie sehen vorab
verifizierte Investoren-Profile mit Finanzierungsstaerke und Trackrecord
und laden gezielt ein (Reverse-Marketplace). Erst nach Doppel-Freigabe
werden Adresse und Eigentuemer-Kontakt freigeschaltet — dann steht ein
1:1-Chat (Polling) zur Verfuegung. Bestehende Listing/Marketplace/
Inquiry/SaleProcess-Flows bleiben unveraendert.

- ✅ Prisma: `OffmarketLead`, `OffmarketInvite`, `OffmarketMessage` +
  Enums `OffmarketLeadStatus {DRAFT, ACTIVE, PAUSED, CLOSED}`,
  `OffmarketInviteStatus {PENDING, ACCEPTED, DECLINED, WITHDRAWN, EXPIRED}`.
  Migration in `deploy/83_phase-f1-offmarket-schema.bat`
  (`20260517_add_offmarket`).
- ✅ Backend Owner-Endpoints (alle unter `/me/offmarket-leads`,
  daher automatisch `requireAuth`):
  - `GET/POST /me/offmarket-leads`
  - `GET/PATCH/DELETE /me/offmarket-leads/:id`
  - `GET /me/offmarket-leads/:id/match` — ranked Investoren-Liste
    (4-Achsen-Score: Asset/Region/Ticket/Finanzierung)
  - `POST /me/offmarket-leads/:id/invite` (body `{investorIds[], ownerNote?}`)
  - `POST /me/offmarket-invites/:id/withdraw`
- ✅ Backend Investor-Endpoints:
  - `GET /me/offmarket-invites` (anonyme Sicht bis ACCEPTED)
  - `GET /me/offmarket-invites/:id`
  - `POST /me/offmarket-invites/:id/respond` (action ACCEPT/DECLINE)
- ✅ Backend Chat-Endpoints (Polling, kein WS):
  - `GET /me/offmarket-invites/:id/messages` (markiert Empfaenger-Nachrichten als gelesen)
  - `POST /me/offmarket-invites/:id/messages`
- ✅ Backend Discovery + Public Stats:
  - `GET /offmarket/investors?city=&assetType=&minTicket=&maxTicket=`
    (auth-pflichtig, Visibility != PRIVATE)
  - `GET /offmarket/stats` — bewusst public, fuer Akquise-Landing
- ✅ Frontend Schemas (`lib/api.ts`): `OffmarketLeadSchema`,
  `OffmarketAnonLeadSchema`, `OffmarketInvestorMatchSchema`,
  `OffmarketMatchResponseSchema`, `OffmarketInviteListItemSchema`,
  `OffmarketMessageSchema`, `OffmarketStatsSchema` + Label-Maps.
- ✅ Frontend Pages:
  - `/offmarket` — Hub mit Stats + Rollen-CTAs
  - `/offmarket/leads` — eigene Offmarket-Inserate (Verkaeufer-Sicht)
  - `/offmarket/leads/neu` — 3-Step Wizard
    (Eckdaten → Anonymisierung → Zusammenfassung)
  - `/offmarket/leads/[id]` — Detail mit Match-Panel + Invite-Modal +
    Status-Aktionen
  - `/offmarket/investoren` — filterbare Investoren-Liste mit
    "Direkt zu Inserat einladen"-Picker
  - `/offmarket/einladungen` — Posteingang fuer Investoren
  - `/offmarket/einladungen/[id]` — Einladungs-Detail mit ACCEPT/DECLINE-Form
    und 1:1-Chat (Polling alle 4s)
- ✅ Wiederverwendbare `OffmarketInvestorCard` mit Finanzierungs-
  Spotlight (Bonitaet, Pre-Approval-Badge, Ticket-Range, Trackrecord).
- ✅ Sidebar additiv erweitert: neue `SECTION_OFFMARKET_SELLER`
  (Verkaeufer-Mode) und `SECTION_OFFMARKET_INVESTOR` (Investor-Mode)
  mit goldenem Akzent. Vermieter/Mieter sehen Offmarket bewusst nicht.
  Bestehende Sections unveraendert.
- ✅ Public Akquise-Landing `/offmarket-fuer-eigentuemer` (Marketing-
  Path, ohne Sidebar-Shell) — fuer eBay-Verkaeufer-Gespraeche. Stats
  live aus `/offmarket/stats`. Middleware + `ConditionalShell` als
  Marketing-Path registriert.
- ⚠️ `prisma generate` lokal nicht ausfuehrbar im Cowork-Sandbox
  (binaries.prisma.sh 403) — Marco fuehrt vor erstem Test die BAT
  `83_phase-f1-offmarket-schema.bat` aus. Auf Railway laeuft
  `prisma migrate deploy` automatisch im Build-Hook.
- ⚠️ Match-Score-Heuristik (4 × 25 Punkte) ist bewusst einfach;
  feinere Gewichtung kann spaeter im selben Algorithmus erfolgen.
- ⚠️ Vorbestehende `ReactNode`-Doppel-Types-Errors (SideNav 56/396/414,
  UploadPage etc.) sind durch doppelte `@types/react` im Repo bedingt
  und haben mit Phase F nichts zu tun — `next build` ignoriert sie.

### Phase E (2026-05-07) — Bewertungssystem

- ✅ Prisma: `Rating` (1:n Inquiry, 2× 1:n User via @relation "RatingsGiven"/"RatingsReceived"),
  `RatingDirection` enum {INVESTOR_TO_SELLER, SELLER_TO_INVESTOR}, `@@unique([inquiryId, direction])`.
  Migration `20260507_add_rating`.
- ✅ Backend Endpoints:
  - `POST /me/ratings` — nur wenn Listing.status==SOLD und Inquiry.status==ACCEPTED.
    Direction wird automatisch aus `req.userId` vs. `inquiry.investorId`/`listing.ownerId`
    bestimmt. Doppel-Ratings pro Richtung verhindert.
  - `GET /me/ratings/given` / `GET /me/ratings/received` (mit Summary)
  - `POST /me/ratings/:id/rebuttal` — Gegendarstellung, nur einmal pro Rating
  - `GET /users/:id/ratings` — public (für Profil-Anzeigen)
  - `ratingSummaryFor()` als Helper liefert `{ avg | null, count }`
- ✅ Marketplace und Inquiry-Endpoints liefern Rating-Summaries mit:
  - `/marketplace` und `/marketplace/:id` → `sellerRating`
  - `/me/inquiries/:id` → `sellerSummary`, `myRating`, `sellerRating`, `canRate`
  - `/me/listings/:id/inquiries` → liefert `{ listingStatus, inquiries: [{… investorSummary, myRating, investorRatingOnMe, canRate}] }`
- ✅ Frontend:
  - `components/StarRating.tsx` — `<StarSummary>` (Read-only) + `<StarPicker>` (interaktiv)
  - `components/RatingForm.tsx` — wiederverwendbare Bewertungs-Form mit rechtlichem Hinweis (DSGVO/§4 UWG/BGH)
  - `/inquiries/[id]` — Bewertung-Section sobald SOLD+ACCEPTED, zeigt eigene + Verkäufer-Rating, fordert ggf. zur Bewertung auf
  - `/listings/[id]/inquiries` — Bewertung-Form pro Inquiry, zeigt Investor-Rating-Summary in der Header-Zeile
  - `/profile` — neue Karte „Bewertungen über mich" mit Aggregat + Liste, Gegendarstellungs-Anzeige
  - `/marketplace` und `/marketplace/[id]` — Verkäufer-Sterne
- ⚠️ Rebuttal-UI noch nicht eingebaut (Bewertete kann aktuell die Gegendarstellung nur via API absetzen — Frontend-Form für `/me/ratings/:id/rebuttal` fehlt). Tech-Debt für Phase E.1.

### Phase D (2026-05-07) — Inquiry-Flow

- ✅ Prisma: `Inquiry` (1:n Listing, 1:n User via @relation "InvestorInquiries"),
  `InquiryStatus` enum {PENDING, ACCEPTED, REJECTED, WITHDRAWN}. Migration
  `20260507_add_inquiry`. Doppelte PENDING-Inquiries werden im Backend
  verhindert, nicht via DB-Constraint (User darf nach REJECTED nochmal anfragen).
- ✅ Backend Inquiry-Endpoints:
  - `POST /me/inquiries` (Investor) — Listing muss ACTIVE sein, kein
    Self-Anfragen, keine doppelten PENDING.
  - `GET /me/inquiries` (Investor-Sicht) + `GET /me/inquiries/:id` —
    bei ACCEPTED: fullAddress + Verkäufer-Email werden über
    `listingViewForInvestor()` freigegeben.
  - `DELETE /me/inquiries/:id` — withdraw (nur PENDING).
  - `GET /me/listings/:id/inquiries` (Verkäufer-Sicht) — liefert
    `investorSnapshotFor()`: User-Daten + InvestorProfile + Trackrecord
    (Visibility wird IMMER ignoriert, weil Inquiry-Aktion = Einwilligung).
  - `PATCH /me/inquiries/:id/respond` — accept/reject + optional Antworttext;
    bei erstem ACCEPT auf einem Listing: Listing-Status auto auf
    `IN_NEGOTIATION`.
- ✅ `/marketplace/:id` erweitert um `myInquiry` (PENDING/ACCEPTED) und
  `isOwner` — damit das Frontend den richtigen Button rendern kann.
- ✅ Frontend:
  - `/marketplace/[id]` hat eine "Anfrage stellen"-Card (Client) mit
    Message-Form (≥10 Zeichen). Status-abhängige Anzeige: PENDING-Hinweis,
    ACCEPTED-Hinweis, „Eigenes Listing" mit Link auf Anfragen, oder
    geschlossen wenn Listing nicht ACTIVE.
  - `/inquiries` — Investor-Sicht aller Anfragen mit Cover-Bild, Status-Badge,
    Auszug der Message.
  - `/inquiries/[id]` — Detail; bei ACCEPTED grüne fullAddress-Box +
    Verkäufer-Email; PENDING-Anfragen können zurückgezogen werden.
  - `/listings/[id]/inquiries` — Verkäufer-Sicht mit Investor-Profil-Karten
    (Bio, Bonität mit Live-Affordability-Calc, Trackrecord-Top-4) +
    Accept/Reject-Buttons mit Antwort-Text.
  - Nav-Link "Anfragen" zwischen "Meine Listings" und "Versteigerungen".
  - "Anfragen ansehen"-Button im Listing-Edit-Header.

### Phase C (2026-05-07) — Verkäufer-Listings + Marketplace + Bilder

- ✅ Prisma: `Listing` (1:n User via ownerId, Cascade-Delete), `ListingImage`
  (1:n Listing); Enums `ListingStatus`, `AnonymizationLevel`. Migration
  `20260507_add_listing` auf Railway.
- ✅ Backend Verkäufer-Endpoints: `GET/POST /me/listings`, `GET/PATCH/DELETE
  /me/listings/:id`, `POST /me/listings/:id/images`, `DELETE
  /me/listings/:listingId/images/:imageId`. Owner-Filter überall.
- ✅ Backend Marketplace: `GET /marketplace` (mit Filter city/type/priceMin/
  priceMax/areaMin, max 100 Items), `GET /marketplace/:id`. Beide nur für
  eingeloggte User, beide laufen `anonymizeListing()` durch — leakt nur die
  Felder, die laut `anonymizationLevel` erlaubt sind. Rohdaten bleiben in DB.
- ✅ Vercel Blob Setup: `@vercel/blob` als Frontend-Dependency, Frontend-Route
  `app/api/upload-image/route.ts` (POST, multipart/form-data, max 4 MB,
  nur images/*, Pathname `listings/<userId>/<timestamp>-<filename>`,
  graceful 503 wenn `BLOB_READ_WRITE_TOKEN` nicht gesetzt).
  **Marco-Schritt:** Vercel Dashboard → Project → Storage → Blob → Create
  Store. Token wird automatisch in Project-Envs gesetzt.
- ✅ Frontend Verkäufer-Seite:
  - `/listings` — Liste mit Status-Badge, Bildanzahl, Status-Übersichts-Karten
  - `/listings/new` — Eckdaten-Form, legt DRAFT an, leitet auf Edit weiter
  - `/listings/[id]/edit` — Vollständige Edit-Form mit Anonymisierungs-Auswahl
    (3 Karten), Status-Dropdown, Bilder-Upload-Section (Drag-and-Drop einfaches
    File-Input, Thumbnail-Grid, Delete pro Bild), Löschen-Button
- ✅ Frontend Marketplace:
  - `/marketplace` — Filter-Card (Stadt, Typ, Preisrange, Min-Fläche),
    Karten-Grid mit Cover-Bild, Verkäufer-Namen
  - `/marketplace/[id]` — Bilder-Galerie, Eckdaten + Lage + Verkäufer-Info,
    respektiert Anonymisierungsstufe (zeigt Hinweis "Vollständige Adresse
    erst nach Anfrage-Annahme — Phase D")
- ✅ Nav-Links "Marketplace" und "Meine Listings" im Layout.

### Phase B (2026-05-07) — Investor-Profil + Trackrecord

- ✅ Prisma: Models `InvestorProfile` (1:1 User), `TrackrecordItem` (1:n User);
  Enums `AssetType`, `ProfileVisibility`, `TrackrecordRole`. Migration
  `20260507_add_investor_profile` auf Railway.
- ✅ Backend: `GET/PATCH /me/profile` (legt bei Bedarf leer an, upsert mit
  Bonität-Calc), `POST /me/trackrecord`, `DELETE /me/trackrecord/:id`.
- ✅ Bonität-Calc (`computeAffordability`): 40 % Netto-Einkommen − Verbindlichkeiten
  als max Kapitaldienst, daraus per Annuität (3,8 % Zins + 2,0 % Tilgung) das
  max Darlehen, plus EK = max Investitionssumme. Selbstauskunft, keine Bankprüfung.
- ✅ Frontend `/profile` mit 4 Sections + Trackrecord:
  - **Identität:** Bio + Erfahrungsjahre
  - **Bonität:** EK / Einkommen / Schulden / Vorab-Genehmigung / Note, mit
    Live-Calc max Darlehen + max Investment beim Tippen
  - **Präferenzen:** Asset-Klassen-Chips, Regionen-Tags, Min/Max Ticket-Size
  - **Sichtbarkeit:** 3 Karten (Privat / Nur bei Anfrage / Öffentlich)
  - **Trackrecord:** Liste + Add-Form (Asset-Typ / Jahr / Rolle / Lage / Volumen /
    Beschreibung) + Delete
- ✅ Nav-Link "Profil" im Layout zwischen "Neues Objekt" und "Bookmarklet".
- ✅ Production-Smoke-Test 2026-05-07: leeres Profil GET liefert defaults,
  alle Sections rendern, PATCH speichert (siehe Live-Test).

### Push A3 (2026-05-06) — Onboarding + Rollen-Auswahl

- ✅ Schema: `User.onboardingCompletedAt: DateTime?`. Migration
  `20260506_add_user_onboarding`.
- ✅ Backend: `PATCH /me` (Rolle/Name updaten), `POST /me/complete-onboarding`
  (setzt Timestamp + optional Rolle/Name). `GET /me` liefert `onboardingCompletedAt`.
- ✅ Frontend `/onboarding` mit 3-Karten-UI (Investor/Verkäufer/Beides) +
  Anzeigename. Server-Component prüft auf `onboardingCompletedAt` und
  redirected auf `/dashboard`, wenn schon abgeschlossen.
- ✅ Redirect-Guard `requireOnboardedUser()` in `lib/api-server.ts`, eingebaut
  in allen geschützten Pages (siehe Frontend-Routen-Tabelle).
- ✅ Footer-Fix: "End-to-End MVP (ohne Auth)" → "Investor- und Verkäufer-Tool
  für MFH/Gewerbe" (war seit Push A2 falsch).
- ✅ Production-Smoke-Test 2026-05-06: Marco wurde von /dashboard auf /onboarding
  geleitet, wählt "Beides", POST /me/complete-onboarding gibt 200, redirect
  auf /dashboard funktioniert. `/me` liefert `role: "BOTH"`,
  `onboardingCompletedAt: "2026-05-06T20:53:25.394Z"`.

### Push A2 (2026-05-06) — User-Modell + Owner-Filter

- ✅ Prisma: Enum `UserRole`, neues Model `User { clerkId(unique), email, name, role }`,
  `Property.ownerId` nullable + `onDelete: SetNull`. Migration
  `20260506175214_add_users_and_owner` auf Railway.
- ✅ Backend `requireAuth` (`backend/src/lib/auth.ts`): verifiziert Clerk-JWT,
  provisioniert User Just-in-Time, hängt `req.userId` an. `app.use("/properties",
  requireAuth)` etc. — alle API-Routen geschützt außer `/health`.
- ✅ Owner-Filter überall: `findUnique` durch `findFirst({ where: { id, ownerId } })`,
  CREATEs setzen `ownerId: req.userId`.
- ✅ `GET /me` + `POST /me/claim-legacy` für Migration bestehender Pre-Auth-Daten.
- ✅ Frontend: `lib/api-server.ts` (NEU, server-only) + `lib/client-fetch.ts`
  (NEU, `useApiFetch` Hook). Alle Server-Components und Client-Components
  umgezogen. `lib/api.ts` hat jetzt nur noch Zod-Schemas.
- ✅ `middleware.ts` schützt `/dashboard`, `/property/*`, `/auctions/*`, `/new`
  via `auth.protect()`.
- ✅ Landing-Page `/` für nicht-eingeloggte User.
- ✅ `ClaimLegacyBanner` auf Dashboard, wenn `legacyCount > 0`.
- ✅ Bookmarklet-Receiver `/bookmarklet/receive/route.ts` mit Auth-Check und
  Token-Forwarding ans Backend.
- ✅ Production-Smoke-Test 2026-05-06: 3 Pre-Auth-Properties via Claim-Legacy
  auf Marcos Account übernommen, `/me` liefert `legacyCount=0`, alle Detail-Cards
  rendern, Notes-CRUD funktioniert.

### Push A1 (Davor) — Clerk-Integration

- ✅ Clerk-App angelegt, Keys in Vercel + Railway eingetragen
- ✅ `@clerk/nextjs` integriert, `<ClerkProvider>` in Root-Layout
- ✅ Sign-up/Sign-in funktioniert end-to-end

### Roadmap nach Phase E

**Phase F** *(optional)* — In-App Messaging zwischen Käufer + Verkäufer in
einer akzeptierten Inquiry. Realtime via WebSockets oder Polling. Anfänglich
reicht E-Mail-Kontakt nach Accept.

**Tech-Debt für Phase E.1:** Frontend-Form für Gegendarstellung
(`POST /me/ratings/:id/rebuttal`). Backend-Endpoint existiert, UI fehlt.
Bewertete sehen aktuell die negative Bewertung auf `/profile`, können aber
nur per direkten API-Call antworten.

**Tech-Debt allgemein:** Visibility-Enforcement auf `/marketplace`-Karten
(zeigt aktuell `owner.name` ohne Sichtbarkeits-Check). Profil-Visibility
PRIVATE/ON_REQUEST/PUBLIC ist nur bei Inquiry-Snapshot durchgesetzt.

### Phase 3 (2026-04-29) — Universal-Bookmarklet

- ✅ Backend CORS auf `/import/*` für beliebige Origins offen (`bookmarkletCors`)
- ✅ POST `/bookmarklet/receive` (Frontend Route Handler) als CSP-sicherer
  Server-Side-Proxy: Bookmarklet macht Form-POST (umgeht Immoscout `connect-src`),
  Frontend ruft Backend mit Token auf
- ✅ `/bookmarklet`-Page mit Drag-to-Bookmarks-Anleitung (Auction-/Expose-Modus)
- ✅ Live-Test auf Immoscout24 (Expose) und ZVG-Portal (Auction) bestanden

### Phase 2 (2026-04-28) — Listen-Import

- ✅ Claude `extract_auction_list` (max 50 Items)
- ✅ `POST /import/auction-list` (URL → Server-Side-fetch → bulk insert,
  AuctionType aus Domain), neuer Tab in `/auctions/import`
- ⚠️ Bekannte Limitierung: SPAs (DGA) brauchen Bookmarklet (Phase 3)

### Phase 1 (2026-04-28) — ZVG-Importer + Bietlimit

- ✅ `DealType` + `AuctionType` Enums, `Property.dealType`, `AuctionInfo` 1:1
- ✅ Calc-Lib: `computeBidLimit(rent, assumptions)` per Bisektion (max Preis
  bei CF n. Steuer ≥ 0)
- ✅ Claude Tool-Use `extract_auction` für ZVG-Bekanntmachungen
- ✅ PDF-Parser `pdf-parse` mit eigener Type-Shim
- ✅ `POST /import/auction` (Text/PDF/URL), `POST /properties/:id/recompute-bid-limit`
- ✅ `/auctions`-Page (sortiert anstehend → ohne Termin → vergangen),
  `/auctions/import`, Auction-Card auf Property-Detail mit Termin-Banner
- ⚠️ Bekannt: `auctionDate` als UTC, im Browser +2 h CEST. Fix später.

### Block C (2026-04-27) — KI-Magie

- ✅ `claude.ts` refactored: `callWithTool` mit `tool_choice`, drei Use-Cases
  (`propose_offer`, `extract_property`, `market_comparison`)
- ✅ `MarketComparison` Model + Migration
- ✅ POST `/import/expose`, POST `/properties/:id/market-comparison`
- ✅ Schnell-Import-Card auf `/new`, Marktvergleich-Card auf Property-Detail

### Block B (2026-04-27) — Finanzielle Tiefe

- ✅ `Analysis` 1:1 → 1:n, 9 Annahmen + 11 Outputs mit Defaults
- ✅ `computeFullAnalysis` (Kaufnebenkosten, EK, Zins, Tilgung, AfA, Steuer,
  Renditen, Cashflow vor/nach Steuer, Score)
- ✅ Snapshots statt Upsert, DELETE `/analyses/:id`
- ✅ Analyse-Szenarien-Card mit Vergleichstabelle, Schnell-Analyse + Eigenes Szenario

### Block A (2026-04-26) — Pipeline-Sicht

- ✅ `DealStatus` Enum, `Note` Model
- ✅ PATCH/DELETE `/properties/:id`, Notes-CRUD, Status-Filter
- ✅ Status-Badge, Filter-Tabs, Score in Liste, Notes-Panel, Edit-Seite

### Stage 0 (2026-04-26) — Setup & Deploy

- ✅ Code generiert, GitHub-Repo, Railway+Postgres, Vercel-Deploy
- ✅ End-to-End Production-Test bestanden

## Bekannte Limitierungen / Tech-Debt

- `Offer` ist 1:1 zur Property — Historie geht beim Re-Generate verloren
- Score-Heuristik ist grob (Netto-Rendite + CF n. Steuer), nicht risikoadjustiert
- `auctionDate` als UTC (Anzeige +2 h CEST verschoben)
- `frontend/PropertyActions.tsx` nutzt `alert()` statt Toast
- Bonität-Calc ist Faustformel (40 % Einkommen-Cap, 5,8 % Annuität) — Selbstauskunft,
  keine Bankprüfung; für Phase D evtl. Verifikations-Stufe ergänzen
- `requireOnboardedUser()` macht in jeder geschützten Server-Page einen extra
  `/me`-Call — pragmatisch, könnte später per Layout/Cache optimiert werden
- Profil-Sichtbarkeit ist nur gespeichert, noch nicht durchgesetzt — Enforcement
  kommt erst in Phase D mit dem Inquiry-Flow
- Bilder-Upload fuer LISTINGS ist seit Phase M5 (2026-05-20) auf
  Client-Upload via `@vercel/blob/client` umgestellt (kein 4-MB-Limit,
  Multi-Select, clientseitige JPEG-Komprimierung). Die alte Route
  `/api/upload-image` bleibt als Fallback fuer Offmarket-, Rental- und
  Tenant-Profil-Bilder bestehen — sollte bei Gelegenheit ebenfalls
  migriert werden (Tech-Debt).
- Marketplace-Karten zeigen aktuell `owner.name` ohne Sichtbarkeits-Check —
  fixen wir mit Phase D (Profil-Visibility wird dann durchgesetzt).
- Keine Tests (weder Backend noch Frontend)
- Bookmarklet-Receiver leitet nur Token weiter, keine Rate-Limiting

## Deploy-Historie (auszugsweise, neueste zuerst)

| Datum       | Inhalt                                                       |
|-------------|--------------------------------------------------------------|
| 2026-06-20  | Phase P Partneroekosystem (Tippgeber): Modell FinancingPartner + Enum (Migration 20260620150000_financing_partners), Admin-CRUD + seed-demo, neutrales kriterienbasiertes Matching GET /properties/:id/financing-partners (Volumen/LTV/Region), Objekt-Panel "Passende Finanzierungspartner" + Admin-Seite /admin/financing-partners + Sidebar. KEINE Vermittlung durch Oikos. Lead-Uebergabe (Opt-in) = naechste Stufe. |
| 2026-06-20  | Objekttiefe: Property + yearBuilt/condition/energyClass/units (Migration 20260620140000_property_object_depth, BuildingCondition/EnergyClass-Enums) + Zod (Create/Update) + PropertySchema + Edit-Formular (Objektdetails-Block) + Mappe-Anzeige (Sektion 2). |
| 2026-06-20  | Mappe: Oikos Deal-Rating (A-D) Siegel auf Deckblatt (computeDealRating: Rendite+Resilienz+Bankfaehigkeit+Markt) + Druck-Feinschliff (break-before-page je Hauptsektion, fixe Print-Fusszeile mit Objekt+Stand). |
| 2026-06-20  | Fix Mappe-Optik: alle SVG-Diagramme responsiv (width 100% + viewBox) — kein Ueberlauf mehr ueber die Spalte/Seite (u. a. Marktvergleich-Range); Wert-Label am Rand sauber geankert. |
| 2026-06-20  | Fix Mappe-Konsistenz: Mappe rechnet jetzt (wie die Ampel) IMMER aus Profil-Eigenkapital statt aus gespeicherter Analyse — Dashboard-DSCR/LTV/Cashflow stimmen mit der Bankfaehigkeits-Sektion ueberein. |
| 2026-06-20  | Finanzierungsmappe v2 (Burggraben): Deckblatt + KPI-Dashboard + eigene SVG-Grafiken (Score-Donut, Cashflow-Balken, Tilgungsverlauf, Vermoegensprojektion, Stresstest-Balken, Markt-Range). Proprietaere Kennzahlen: Stresstest (Zins/Leerstand/Miete), Tilgungsplan + Restschuld, Vermoegensaufbau 15J, Eigenkapitalrendite/Leverage, Oikos-Bietlimit. Engine: finanzierungsmappe/compute.ts (mirror calc.ts) + charts.tsx. Reine Aufbereitung, keine Migration. |
| 2026-06-20  | Finanzierungsanfrage-Formular: Wunsch-Darlehensbetrag + Notiz beim Speichern (CreateFinancingRequestButton als Formular); Cockpit zeigt beide. Felder waren in DB/Backend schon vorhanden. |
| 2026-06-20  | Unterlagen-Checkliste: Bank-Readiness-Checkliste in der Ampel (financing.ts -> checklist[]; Panel rendert vorhanden/fehlt/manuell) — zeigt konkret, welche Daten/Unterlagen fuer die Finanzierung fehlen. |
| 2026-06-20  | Finanzierungsmappe: druck-/PDF-fertiges bankfaehiges Expose (/property/:id/finanzierungsmappe) — Objekt, Wirtschaftlichkeit, Kapitaldienst, Selbstauskunft, Bankfaehigkeit; Print-Button (@media print). Plus push.bat: Commit-Message automatisch aus deploy/commit_msg.txt. |
| 2026-06-20  | Fix (Ampel-Konsistenz): Bankfaehigkeit rechnet jetzt IMMER aus dem tatsaechlichen Eigenkapital (Profil) statt aus einer gespeicherten Analyse — EK/DSCR/LTV widersprechen sich nicht mehr, Ergebnis springt nicht mehr. Objekt-Score jetzt leverage-neutral (Nettorendite) und zieht nur auf Gelb, nie auf Rot. |
| 2026-06-20  | Phase O: Persistente Finanzierungsanfrage (NEUE Tabelle FinancingRequest + Migration) — Speichern-Button am Objekt + Status-Liste im Cockpit (POST/GET/PATCH/DELETE /me/financing-requests). **Migration: 20260620120000_financing_requests — laeuft via `prisma migrate deploy` beim Railway-Start.** |
| 2026-06-20  | Phase N+: Finanzierung als eigene Sidebar-Sektion (gruener Akzent) + Cockpit-Seite /finanzierung (GET /me/financing/overview) — Portfolio-weite Bankfaehigkeits-Ampel |
| 2026-06-20  | Phase N: Oikos Capital Layer Schritt 1 — Financing-Readiness-Ampel (lib/financing.ts + GET /properties/:id/financing-readiness + FinancingReadinessPanel) |
| 2026-05-20  | Phase M5.1: Bild-Reihenfolge per Drag-and-Drop (Kanban via @dnd-kit) + Backend-Reorder-Endpoint + Cover-Badge |
| 2026-05-20  | Phase M5 Hotfix: Listing-Dedup-Window + Client-Upload via @vercel/blob/client + Multi-Select + Compression + Custom-Domain infinityoikos.com |
| 2026-05-19  | Phase M4: BuyerAccessManager auf /sales/[id] + /freigaben + /empfangene-freigaben + Sidebar + Auto-Bind |
| 2026-05-19  | Phase M3: Notifications + Inquiry-Auto-Fill + bunte Pipeline-Icons |
| 2026-05-19  | Phase M2: BuyerAccessManager + /zugang/[token]-Page + horizontaler Pipeline-Stepper |
| 2026-05-19  | Phase M1: BuyerDocAccess (Token-Freigabe) + Werbe-Sicht der Pipeline, Kaufpreis-Entkopplung |
| 2026-05-17  | Phase F: Offmarket-Layer (Lead/Invite/Message + Discovery + Wizard + 1:1-Chat + Akquise-Landing) |
| 2026-05-07  | Phase E: Bewertungssystem (beidseitig, Gegendarstellung, rechtliche Hinweise) |
| 2026-05-07  | Phase D: Inquiry-Flow (Profil-Auszug bei Anfrage, Accept/Reject, fullAddress-Freigabe) |
| 2026-05-07  | Phase C: Verkäufer-Listings + Marketplace + Bilder-Upload    |
| 2026-05-07  | Phase B: Investor-Profil + Trackrecord + Bonität-Calc        |
| 2026-05-06  | Push A3: Onboarding + Rolle wählen + Footer-Fix              |
| 2026-05-06  | Push A2: User-Modell + ownerId + Auth-Middleware + Legacy-Claim |
| 2026-05-05  | Push A1: Clerk-Integration                                   |
| 2026-04-29  | Phase 3: Bookmarklet                                         |
| 2026-04-28  | Phase 1+2: ZVG-Import, Listen-Import                         |
| 2026-04-27  | Block B+C: Analyse-Snapshots, KI-Magie                       |
| 2026-04-26  | Block A + Stage 0: Pipeline + Initial Deploy                 |

---

## Begleitdateien

- `AGENTS.md` — Verhaltensregeln für Software-Agenten an diesem Projekt
- `deploy/README.md` — Schritt-für-Schritt-Anleitung für Setup & Deploy
- `deploy/*.bat` — Skripte zum Doppelklicken
- `README.md` — Kurze Einstiegs-Doku

## Regeln für den Agenten (Kurzfassung)

- **Erst lesen, dann handeln** — `project_state.md` und `AGENTS.md` sind
  Pflichtlektüre vor jeder neuen Aufgabe.
- **Live testen nach Deploy** — Health + Endpoint-Call, nicht "sollte klappen".
- **`.env` niemals committen.**
- **BAT-Dateien** nur in `deploy/`, exakte Sprache zur Kommunikation
  ("Klicke folgende BAT: …").
- **Owner-Filter NIE vergessen** — neue Routes brauchen `where: { ownerId: req.userId }`,
  CREATEs setzen `ownerId: req.userId`. Sonst Datenleck.
- **Diese Datei aktualisieren**, wenn etwas Substanzielles passiert ist
  (URL geändert, Endpoint dazu, Bug gefixt, Phase abgeschlossen).
