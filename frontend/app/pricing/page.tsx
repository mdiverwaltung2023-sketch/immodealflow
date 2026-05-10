import Link from "next/link";
import { BillingStateSchema } from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { PricingTable } from "./IntervalToggle";

type Search = { billing?: string };

export default async function PricingPage({ searchParams }: { searchParams?: Search }) {
  await requireOnboardedUser();
  const billing = await apiGet("/me/billing", BillingStateSchema).catch(() => ({
    plan: "FREE" as const,
    planValidUntil: null,
    hasSubscription: false,
    stripeReady: false
  }));

  const justSucceeded = searchParams?.billing === "success";
  const justCancelled = searchParams?.billing === "cancelled";

  return (
    <div className="space-y-8">
      {/* Banner nach Stripe-Redirect */}
      {justSucceeded ? (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold">Abo aktiv — willkommen.</div>
              <div className="mt-1 text-xs">
                Es kann ein paar Sekunden dauern, bis dein neuer Plan im UI ankommt
                (Stripe-Webhook). Lade die Seite einmal neu, falls die Plan-Anzeige
                noch „Free" zeigt.
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {justCancelled ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Checkout abgebrochen — kein Plan-Wechsel. Du kannst es jederzeit erneut starten.
        </div>
      ) : null}

      {/* Hero */}
      <div className="space-y-3 text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
          Mitgliedschaft
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Werde Mitglied im Investor Club.
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-zinc-600">
          Off-Market-Deals, KI-gestützte Bietlimits und ein verifizierter Kreis
          von Käufern, Verkäufern und Vermietern. Verkäufer und Vermieter
          inserieren bei uns kostenlos — wir monetarisieren ausschließlich
          die Investorenseite.
        </p>
        <div className="text-xs text-zinc-500">
          Aktueller Plan:{" "}
          <span className="font-semibold text-zinc-800">{billing.plan}</span>
          {billing.planValidUntil ? (
            <>
              {" "}· gültig bis {new Date(billing.planValidUntil).toLocaleDateString("de-DE")}
            </>
          ) : null}
        </div>
      </div>

      {!billing.stripeReady ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <div className="font-semibold">Stripe ist auf dem Backend noch nicht konfiguriert.</div>
          <div className="mt-1 text-xs">
            Die Buttons unten sind sichtbar, aber starten noch keinen echten Checkout.
            Sobald die Stripe-Keys in Railway gesetzt sind und das Backend neu deployed
            ist, sind die Pläne aktivierbar. Setup-Anleitung:{" "}
            <code className="rounded bg-white border border-amber-200 px-1 py-0.5 text-[10px]">
              deploy/STRIPE-SETUP.md
            </code>
            .
          </div>
        </div>
      ) : null}

      {/* Plans */}
      <PricingTable currentPlan={billing.plan} stripeReady={billing.stripeReady} />

      {/* FAQ-Block */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Häufige Fragen</h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div>
            <dt className="font-semibold text-zinc-800">
              Was bringt mir Off-Market-Zugang konkret?
            </dt>
            <dd className="mt-1 text-zinc-600">
              Off-Market-Inserate werden 4–7 Tage vor allen anderen für Investor-Club-
              Mitglieder freigeschaltet. Du siehst Deals, bevor sie in den klassischen
              Portalen erscheinen — das ist genau das Fenster, in dem die besten Preise
              gemacht werden.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-zinc-800">
              Wie zuverlässig ist die KI-Bietlimit-Analyse?
            </dt>
            <dd className="mt-1 text-zinc-600">
              Unser Modell nutzt Mietspiegel, Lageparameter, Energiekennwerte und
              vergleichbare Deals, um pro Objekt ein Bietlimit vorzuschlagen. Der
              Vorschlag ist datengetrieben und nachvollziehbar — du behältst die
              endgültige Entscheidung.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-zinc-800">
              Verkäufer und Vermieter — wirklich kostenlos?
            </dt>
            <dd className="mt-1 text-zinc-600">
              Ja. Unbegrenzt Inserate, kein Abo, keine versteckten Kosten. Wir
              monetarisieren ausschließlich die Investorenseite — das macht die
              Plattform für Anbieter risikofrei und für Investoren wertvoller.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-zinc-800">
              Was bedeutet „Verifiziert-Badge"?
            </dt>
            <dd className="mt-1 text-zinc-600">
              Investor-Club-Mitglieder durchlaufen einmalig einen KYC- und
              Bonitäts-Check. Verkäufer sehen das Badge an deinem Profil und nehmen
              Anfragen mit Badge deutlich häufiger an.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-zinc-800">
              Wie kündige ich, falls ich es nicht brauche?
            </dt>
            <dd className="mt-1 text-zinc-600">
              In zwei Klicks über{" "}
              <Link
                href="/profile"
                className="text-indigo-600 hover:text-indigo-700 underline"
              >
                /profile
              </Link>{" "}
              im Stripe Customer Portal. Monatlich kündbar zum Periodenende, ohne
              Frist und ohne Rückfragen.
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
