# Phase M — Verkaufsabwicklung 2.0 (Konzept)

> Stand: 2026-05-19. Marco hat den Wunsch geäußert, die Verkaufsabwicklung
> grundlegend umzubauen. Dieses Dokument ist der Plan; Phase M1 ist der
> erste Push.

## Problem (Marco-Brief)

1. **UI-Lockfunnel:** Der Verkäufer sieht die *guten* Optionen
   (13-Stages-Pipeline, 14 Dokumenten-Slots) erst, NACHDEM er im Start-Modal
   einen vereinbarten Kaufpreis eingegeben hat. Diese Optionen sind aber ein
   Werbemittel — Verkaufsabwicklung soll als USP transparent **vor** dem
   Eintragen des Kaufpreises sichtbar sein.
2. **Pipeline-Visualisierung schwach:** Aktuell ein 4-Spalten-Karten-Grid.
   Marco will eine *grafische* horizontale Pipeline (Stage-Stepper) wie eine
   sichtbare Wertschöpfungskette.
3. **Kopplung Kaufpreis ↔ Pipeline:** Pipeline-Start sollte NICHT mehr an die
   Kaufpreis-Eingabe gekoppelt sein. Verkäufer startet die Pipeline manuell,
   wann immer er will — auch ohne Käufer.
4. **Käufer-Freigabe von Dokumenten vor Kaufpreisangebot fehlt:** Manche
   Dokumente (Grundbuch, Energieausweis, Flurkarte, Mietverträge …) muss
   der Käufer schon VOR Besichtigung/Angebot sehen. Heute geht das nur, wenn
   der Käufer einen Inquiry-Flow durchläuft. Das wollen wir entkoppeln:
   Verkäufer wählt einen konkreten Kaufinteressenten + die freigegebenen
   Dokumente und erzeugt einen Token-Link, den er per Mail/WhatsApp teilt.

## Entscheidungen (mit Marco geklärt 2026-05-19)

| Frage | Entscheidung |
|-------|--------------|
| Käufer-Zugang | **Sicherer Freigabe-Link (Token)** — Verkäufer erzeugt pro Interessent einen Link; kein Account nötig; optional zeitbegrenzt. |
| Pipeline-Ort | **Eigener Tab pro Inserat** im Verkäuferbereich, immer einsehbar, manuell startbar. |
| Käufer-Sicht | **Nur freigegebene Dokumente** — keine Pipeline-Sicht für den Käufer. Verkäufer behält volle Kontrolle über die Story. |

## Architektur — Datenmodell (Prisma)

Neues Modell `BuyerDocAccess`. Eine Freigabe ist ein Token-basierter,
zeitlich optional begrenzter Zugriff auf eine ausgewählte Untermenge von
Dokumenten-Kategorien (`SaleDocKind[]`). Die Freigabe gehört zum **Listing**
(nicht zum SaleProcess), damit Pre-Sale-Freigaben auch ohne aktiven
SaleProcess funktionieren. Sobald ein SaleProcess existiert, werden dessen
Dokumente automatisch in die Freigabe gespiegelt — der Verkäufer pflegt
Dokumente an genau einer Stelle.

```
model BuyerDocAccess {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Wem gehört die Freigabe?
  listingId   String
  listing     Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)
  sellerId    String
  seller      User     @relation("BuyerAccessSeller", fields: [sellerId], references: [id], onDelete: Cascade)

  // Optional: schon zugeordneter Marketplace-Interessent / Käufer.
  inquiryId   String?
  inquiry     Inquiry? @relation(fields: [inquiryId], references: [id], onDelete: SetNull)
  buyerUserId String?
  buyerUser   User?    @relation("BuyerAccessBuyer", fields: [buyerUserId], references: [id], onDelete: SetNull)

  // Freitext-Label des Verkäufers für seine eigene Übersicht.
  buyerLabel  String?           // "Familie Müller, Termin 25.05."
  buyerEmail  String?           // optional, nur Eigenrefenz
  notes       String?

  // Token, zufällig 256 bit hex (64 Zeichen). Unique-Index.
  token       String   @unique

  // Welche Dokumenten-Kategorien sind freigegeben?
  allowedDocKinds SaleDocKind[]

  // Ablauf / Revoke
  expiresAt   DateTime?
  revokedAt   DateTime?

  // Audit
  lastAccessedAt DateTime?
  accessCount    Int       @default(0)

  @@index([listingId, sellerId])
  @@index([sellerId, revokedAt])
}
```

## Endpunkte — Backend

Alle Verkäufer-Endpunkte unter `/me` (Auth-geschützt via existierender
`app.use("/me", requireAuth)`). Der Käufer-Endpoint ist **bewusst public**
(Token-basiert).

| Methode | Pfad | Zweck |
|---------|------|-------|
| GET | `/me/listings/:listingId/buyer-access` | Liste aller Freigaben für ein eigenes Listing |
| POST | `/me/listings/:listingId/buyer-access` | Neue Freigabe erstellen (Body: `allowedDocKinds[]`, optional `buyerLabel`, `buyerEmail`, `inquiryId`, `expiresAt`, `notes`) |
| PATCH | `/me/buyer-access/:id` | Felder aktualisieren (`allowedDocKinds`, `expiresAt`, `notes`, `revoke`) |
| DELETE | `/me/buyer-access/:id` | Hart löschen (Token wird unbrauchbar) |
| GET | `/public/buyer-access/:token` | Public — gibt zurück: anonymisiertes Listing + freigegebene Dokumente mit Download-URLs. Erhöht `accessCount` + `lastAccessedAt`. Antwort 404 bei abgelaufen/widerrufen/unbekannt. |

Anonymisierung respektiert die `Listing.anonymizationLevel`-Stufe — solange
der Verkäufer den Token persönlich an einen Interessenten gibt, ist das nur
ein zusätzlicher Schutz, falls der Link weitergeleitet wird.

Die Dokumente werden serverseitig aus dem zugehörigen `SaleProcess`
(via `listingId`) geholt. Falls (noch) kein SaleProcess existiert, hat der
Verkäufer auch keine Dokumente hochgeladen — die Freigabe-Response liefert
dann eine leere Liste mit Hinweis. Genau aus diesem Grund kann das Datei-
Upload-Verhalten in Phase M2 so umgebaut werden, dass beim ersten Upload
automatisch ein SaleProcess angelegt wird (statt jetzt: erst Process
anlegen, dann hochladen).

## UI — Phasen

### Phase M1 (DIESER PUSH)

- **Datenmodell + Migration** `BuyerDocAccess`
- **Backend-Endpunkte** (5 Routes oben)
- **Frontend-Schemas** in `frontend/lib/api.ts`
- **`StartSaleProcessButton` entkoppeln:** keine Modal-Eingabe von Preis/
  Notiz mehr; Klick legt direkt einen SaleProcess (ohne `agreedPrice`,
  ohne `notes`) an und navigiert auf `/sales/:id`. Preis + Notizen pflegt
  der Verkäufer dort über die bestehenden `ProcessFields` ein.
- **`project_state.md`** um Phase M1-Eintrag erweitern.

Ergebnis nach M1: Verkäufer kann mit einem Klick die Pipeline starten,
ohne Preis-Eingabe. Backend kann Freigabe-Token erzeugen und einlösen.
UI für Freigabe-Erstellung folgt in M2.

### Phase M2 (folgt nach M1)

- Neuer Tab `Verkaufsabwicklung` direkt auf `/listings/[id]/edit`
  (zwischen den Inhalten der Edit-Seite und der bestehenden CardArea).
  Tab zeigt IMMER:
  - 13-Stages **horizontaler Pipeline-Stepper** (statt Grid)
  - 14 Dokumenten-Slots (Read-only-Hinweis falls Pipeline noch nicht
    gestartet — Upload-Button startet Pipeline + Upload in einem Schritt)
  - Sektion "Freigaben an Interessenten" mit Liste + Neu-Button
- Neues Modal "Freigabe erstellen" — wählt Kategorien per Checkbox,
  optional Ablaufdatum, Buyer-Label.
- Neue Public-Page `/zugang/[token]` — zeigt freigegebene Dokumente
  als Download-Liste.

### Phase M3 (optional)

- Möglichkeit, einen einzelnen Inquiry-Käufer direkt mit einer
  vorbereiteten Freigabe-Vorlage zu versorgen (Auto-Fill).
- Auto-Provision eines SaleProcess beim ersten Dokument-Upload.
- Notification an Verkäufer beim ersten Token-Abruf
  (Mail oder In-App).

## Sicherheit / Datenschutz

- Tokens: 256 bit (32 byte) zufällig, hex-codiert (64 Zeichen). Plain im
  Token-Feld gespeichert mit Unique-Index. Nicht weniger sicher als ein
  Stripe-Webhook-Secret. Bei Bedarf später hashen.
- Tokens sind im Verkäufer-UI sichtbar (kopierbarer Link). Bei `revokedAt`
  set → Public-Endpoint antwortet 404.
- `accessCount` + `lastAccessedAt` für Audit ("wurde der Link überhaupt
  geöffnet?").
- DSGVO: `buyerEmail` ist optional Eigennotiz. Es werden keine
  personenbezogenen Daten des Käufers an Dritte weitergegeben — der
  Käufer öffnet den Token selbst.
- Anonymisierung des Listings im Public-Endpoint respektiert die
  `Listing.anonymizationLevel`-Stufe.

## Migration-Risiken

- `SaleDocKind[]` als Array-Spalte braucht Postgres-Support
  (vorhanden — Prisma 6, Railway-Postgres).
- Bestehende SaleProcesses bleiben unangetastet — additive Migration.
- `StartSaleProcessButton` ist UI-only; Anpassung minimal-invasiv,
  bestehende Logik in `/sales/[id]/ProcessFields` übernimmt Preis-Pflege.
