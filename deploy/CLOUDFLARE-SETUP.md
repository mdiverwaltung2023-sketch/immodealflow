# Cloudflare-Setup für infinityoikos.com

Schritt-für-Schritt-Anleitung, um die Domain `infinityoikos.com` bei
Cloudflare zu registrieren und mit Vercel (Frontend) + Railway (Backend)
zu verknüpfen. Reihenfolge wichtig — sonst CORS- oder DNS-Caching-Probleme.

> **Voraussetzung:** Cloudflare-Account ist vorhanden (gleicher wie für
> Infinity Eidos). Vercel-Projekt `immodealflow-frontend` ist live, Railway-
> Projekt `dealflow-ai-backend` ist live.

---

## Schritt 1 — Domain bei Cloudflare Registrar kaufen

1. Login auf https://dash.cloudflare.com
2. Linkes Menü → **Domain Registration** → **Register Domains**
3. Suchfeld: `infinityoikos.com` → Verfügbarkeit prüfen
4. **Add to Cart** → Checkout
   - Cloudflare Registrar verkauft Domains zum Wholesale-Preis (kein Aufschlag)
   - `.com` kostet ca. 10–11 EUR/Jahr
   - Auto-Renewal aktivieren empfohlen
5. Bezahlen → ~5 Minuten warten, bis die Domain im Account erscheint

Cloudflare ist automatisch DNS-Provider für die Domain. Du musst NICHT
Nameserver wechseln — bei Cloudflare-Registrar passiert das automatisch.

---

## Schritt 2 — DNS-Records anlegen (root + www + api)

1. Cloudflare-Dashboard → `infinityoikos.com` → **DNS** → **Records**

2. Lösche alle automatisch erstellten Default-Records (Cloudflare legt
   manchmal Demo-Records an — `pageRules` etc.). Tabula rasa.

3. Lege drei Records an:

   | Typ   | Name | Inhalt                                   | Proxy-Status      |
   |-------|------|------------------------------------------|-------------------|
   | A     | @    | `76.76.21.21`                            | Proxied (orange)  |
   | CNAME | www  | `cname.vercel-dns.com`                   | DNS only (grau)   |
   | CNAME | api  | `dealflow-ai-backend-production.up.railway.app` | DNS only (grau) |

   - **`@`** ist die Root-Domain (`infinityoikos.com`). Vercel hat eine feste
     IP für Root-A-Records: `76.76.21.21`.
   - **`www`** ist `www.infinityoikos.com` — CNAME zu Vercel.
   - **`api`** ist `api.infinityoikos.com` — Backend auf Railway.

   **Wichtig:** Backend-CNAME (`api`) MUSS DNS-only (grau) sein — wenn
   proxied, bricht Cloudflare die Long-Polling-Connections von Clerk JWT
   und Express setzt Cookies/Headers, die Cloudflare anders interpretiert.
   Vercel-Records (`@` und `www`) können beide Modi, aber `@` proxied gibt
   dir Cloudflare-Cache + DDoS-Schutz auf der Frontend-Seite.

4. **SSL/TLS Mode** prüfen: links Sidebar → **SSL/TLS** → **Overview**
   - Auf **Full (strict)** stellen
   - Vercel und Railway haben beide gültige SSL-Zertifikate, also passt das

---

## Schritt 3 — Domain in Vercel verknüpfen

1. https://vercel.com/dashboard → `immodealflow-frontend` → **Settings** → **Domains**
2. **Add Domain** → `infinityoikos.com` → **Add**
3. Vercel zeigt Verifikations-Status:
   - Bei A-Record für `@` → grün ✓ (kann 1–5 Minuten dauern wegen DNS-Propagation)
4. Nochmal **Add Domain** → `www.infinityoikos.com` → **Add**
   - Vercel schlägt automatisch vor: Redirect `www` → root oder umgekehrt
   - Empfehlung: **Redirect www → root** (`infinityoikos.com` als Hauptdomain)
5. **Production Branch** prüfen: `main` (sollte schon stimmen)
6. Vercel deployt automatisch erneut, sobald Domain verifiziert ist.
   Nach ~2 Minuten: `https://infinityoikos.com` zeigt deine App.

---

## Schritt 4 — Backend-Subdomain in Railway verknüpfen

1. https://railway.com → `exemplary-endurance` → `dealflow-ai-backend` → **Settings**
2. **Networking** → **Custom Domain** → **+ Custom Domain**
3. Eingeben: `api.infinityoikos.com` → **Add**
4. Railway zeigt eine TXT-Verifikation oder akzeptiert sofort, weil der
   CNAME aus Schritt 2 schon zeigt
5. SSL-Zertifikat wird automatisch von Railway provisioniert (Let's Encrypt)
6. Health-Check: `https://api.infinityoikos.com/health` → `{"ok":true}`

---

## Schritt 5 — ENV-Variablen aktualisieren

### Vercel (Frontend)

1. Vercel Dashboard → `immodealflow-frontend` → **Settings** → **Environment Variables**
2. `NEXT_PUBLIC_API_BASE_URL`:
   - Alt: `https://dealflow-ai-backend-production.up.railway.app`
   - Neu: `https://api.infinityoikos.com`
3. **Save** + **Redeploy** (manuell triggern: Deployments → 3-Punkte → Redeploy)

### Railway (Backend)

1. Railway Dashboard → `dealflow-ai-backend` → **Variables**
2. `FRONTEND_ORIGIN` erweitern um die neue Domain:
   - Alt: `https://immodealflow-frontend.vercel.app,http://localhost:3000`
   - Neu: `https://infinityoikos.com,https://www.infinityoikos.com,https://immodealflow-frontend.vercel.app,http://localhost:3000`
   - Die Vercel-URL drinlassen, falls du je vorerst beide nutzen willst
3. Railway deployt automatisch neu nach Variable-Save

---

## Schritt 6 — Clerk Allowed Origins erweitern

1. https://dashboard.clerk.com → DealFlow-AI-App
2. **Configure** → **Domains** → unter "Allowlist" hinzufügen:
   - `https://infinityoikos.com`
   - `https://www.infinityoikos.com`
3. Falls du den Clerk-Modus von "Development" auf "Production" wechselst:
   eigene Production-Keys generieren, in Vercel ENV `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   und `CLERK_SECRET_KEY` aktualisieren, neuen Production-Domain in Clerk
   anlegen. **Achtung:** Production-Mode bei Clerk verlangt explizite
   Allowlist-Domains und stricterer SSL-Check — erstmal in Development
   bleiben für die ersten echten User.

---

## Schritt 7 — Smoke-Test live

1. `https://infinityoikos.com` öffnen → Landing-Page sollte erscheinen
2. **Anmelden** klicken → `/sign-in` → mit bestehendem Account einloggen
3. Dashboard sollte alle 3 Properties zeigen
4. `https://api.infinityoikos.com/health` → `{"ok":true}`
5. Browser-DevTools → Network-Tab → API-Calls sollten an `api.infinityoikos.com`
   gehen, nicht mehr an Railway-URL

---

## Bekannte Fallstricke

- **DNS-Caching**: Wenn du die Domain VOR den DNS-Records in Vercel/Railway
  einträgst, sieht Vercel die Records noch nicht und meldet "Invalid
  Configuration". Lösung: 5–10 Minuten warten oder DNS-Records nochmal
  re-saven in Cloudflare.

- **Cloudflare proxied + Railway**: Wenn `api` CNAME auf "Proxied"
  (orange) steht, wirft Railway 525-Errors. Auf "DNS only" (grau) stellen.

- **CORS-Errors**: Wenn `FRONTEND_ORIGIN` in Railway nicht aktualisiert
  ist, blockiert das Backend Requests von der neuen Domain. Symptom:
  "CORS policy: No 'Access-Control-Allow-Origin' header" in DevTools.

- **Clerk Domain-Mismatch**: Wenn Clerk die neue Domain nicht in der
  Allowlist hat, scheitert der Sign-in mit "domain not allowed". Symptom:
  Sign-in-Button macht nichts.

---

## Optional: E-Mail an Domain (für später)

Cloudflare bietet **Email Routing** kostenlos:
- Du kannst `info@infinityoikos.com` an deine echte Mailadresse weiterleiten
- Cloudflare Dashboard → Domain → **Email** → **Email Routing** → Forward
  einrichten
- Nicht für massive Mailings geeignet — für Empfangen aber genügend für
  den Start

Für ausgehende Mails (Bestätigungen, Newsletter): später Resend, Postmark
oder Brevo dazu.
