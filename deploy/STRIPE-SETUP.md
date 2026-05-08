# Stripe-Setup für Infinity Oikos — Phase G1

Schritt-für-Schritt-Anleitung, um die Subscription-Logik live zu schalten,
sobald BAT 28 gepusht ist und Railway das neue Backend deployed hat.

> **Reihenfolge wichtig.** Erst die Stripe-Produkte anlegen, dann die ENV-Vars
> in Railway setzen, dann den Webhook-Endpoint registrieren. Wenn diese
> Reihenfolge bricht, bekommt der Backend-Container beim Start zwar einen
> aktiven Stripe-Client, aber die Webhook-Signatur passt nicht und alle
> Events landen als 400 in den Logs.

---

## Schritt 1 — Stripe-Produkte und Preise anlegen

1. Login auf https://dashboard.stripe.com
2. Linke Navigation → **Products** → **+ Add product**

Lege **drei** Products an. Unsere Standard-Empfehlung:

### Product 1: "Investor Pro"
Beschreibung: *"Off-Market-Zugang, KI-Tools, Verifiziert-Badge"*

Bei diesem Product zwei Prices anlegen:
- **Monatlich**: `99 €` recurring monthly · Price ID notieren
- **Jährlich**: `999 €` recurring yearly · Price ID notieren

### Product 2: "Verkäufer Pro"
Beschreibung: *"Bis zu 10 Inserate, Premium-Sichtbarkeit, Anbieter-Statistiken"*

Zwei Prices:
- **Monatlich**: `49 €` recurring monthly
- **Jährlich**: `490 €` recurring yearly

### Product 3: "Premium Listing" (Phase G4)
Beschreibung: *"Top-Position 30 Tage, Premium-Pill in Karte und Detail"*

Ein Price:
- **One-Time**: `99 €` · Price ID notieren

> Phase G4 nutzt diese Price-ID als `STRIPE_PRICE_PREMIUM_LISTING`.
> Wenn die Variable fehlt, antwortet `/me/listings/:id/checkout-feature`
> mit 503 — alles andere läuft normal.

---

## Schritt 2 — Stripe Customer Portal aktivieren

In Stripe-Dashboard → **Settings** → **Billing** → **Customer portal**:

1. Aktivieren
2. **Functionality** → erlaube
   - "Customers can switch plans" (anhaken alle 4 Subscription-Prices)
   - "Customers can cancel subscriptions"
   - "Customers can update payment method"
3. **Branding** → Logo + Farben passend zu Infinity Oikos
4. **Save**

So können Marco's Pro-User Plan/Karte/Cancel selbst verwalten —
Backend-Endpoint `/me/billing/portal` öffnet diese Page.

---

## Schritt 3 — Webhook-Endpoint registrieren

In Stripe-Dashboard → **Developers** → **Webhooks** → **+ Add endpoint**:

- **Endpoint URL**: `https://api.infinityoikos.com/webhooks/stripe`
- **Events to listen to** (auswählen):
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- **Add endpoint**

Nach dem Anlegen klick auf den Endpoint → **Signing secret** → **Reveal**
→ kopieren (`whsec_...`). Den brauchst du gleich als `STRIPE_WEBHOOK_SECRET`.

---

## Schritt 4 — ENV-Variablen in Railway setzen

Railway Dashboard → `dealflow-ai-backend` → **Variables** → folgende
Variablen anlegen:

| Variable | Wert | Quelle |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` (Test-Mode für jetzt) oder `sk_live_...` | Stripe → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Webhook aus Schritt 3 |
| `STRIPE_PRICE_INVESTOR_MONTHLY` | `price_...` | Product 1, Monatlich |
| `STRIPE_PRICE_INVESTOR_YEARLY` | `price_...` | Product 1, Jährlich |
| `STRIPE_PRICE_SELLER_MONTHLY` | `price_...` | Product 2, Monatlich |
| `STRIPE_PRICE_SELLER_YEARLY` | `price_...` | Product 2, Jährlich |
| `STRIPE_PRICE_PREMIUM_LISTING` | `price_...` | Product 3, One-Time (G4) |

> **Test-Mode-Tipp:** Für die ersten Tests den Test-Mode in Stripe nutzen
> (oben rechts im Dashboard umschalten). Test-Karten:
> `4242 4242 4242 4242` mit beliebigem Datum + CVC.

Railway deployt automatisch neu, sobald Variables gespeichert sind.

---

## Schritt 5 — Smoke-Test

Sobald Railway das Backend mit den neuen Vars neu gestartet hat:

```bash
# Aktueller Plan-Status (Bearer-Token aus Browser-DevTools kopieren)
curl https://api.infinityoikos.com/me/billing \
  -H "Authorization: Bearer <token>"
# erwartet: { "plan": "FREE", "stripeReady": true, ... }

# Checkout-Session erstellen
curl -X POST https://api.infinityoikos.com/me/billing/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"plan": "INVESTOR_PRO", "interval": "monthly"}'
# erwartet: { "url": "https://checkout.stripe.com/..." }
```

Die zurückgegebene URL aufrufen → Stripe Checkout → mit Test-Karte
abschließen → Erfolgreich → User in der DB hat `plan = INVESTOR_PRO`.

---

## Bekannte Stolperfallen

- **`STRIPE_WEBHOOK_SECRET` falsch**: Backend-Logs zeigen
  `Webhook Error: No signatures found matching the expected signature`.
  → In Stripe-Dashboard auf den Endpoint klicken, **Signing secret**
  neu kopieren, in Railway ENV updaten.
- **Frontend-URL falsch im Checkout**: `success_url` und `cancel_url`
  ziehen aus `FRONTEND_ORIGIN` (erste Domain). Wenn die nicht stimmt,
  redirected Stripe nach Bezahlung auf eine 404-Seite.
- **Kein Customer-Portal-Setup**: `/me/billing/portal` wirft Error
  `No configuration provided`. → Schritt 2 ausführen.
- **Test-Mode vs Live-Mode**: Webhooks und Price-IDs sind getrennt.
  Beim Wechsel zu Live-Mode alle Variablen neu setzen.

---

## Was kommt in Phase G2

- Pricing-Page unter `/pricing` (Frontend)
- Upgrade-CTAs an den richtigen Stellen (Off-Market-Sperre, mehr-als-1-Inserat)
- Customer-Portal-Button im Profil
- Plan-Badge in der TopBar

## Was kommt in Phase G4

- Premium-Listing one-off (99 €/30 Tage) via Stripe Checkout (mode=payment)
- `Listing.featuredUntil` wird durch Webhook gesetzt
- Marketplace-Sortierung priorisiert featured Listings
- Premium-Pill in `ListingCard` und Detail-Header
- Verifiziert-Badge bei Verkäufer-Pro / Investor-Pro
