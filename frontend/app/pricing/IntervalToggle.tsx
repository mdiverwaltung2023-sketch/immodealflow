"use client";

import { useState } from "react";
import { CheckoutButton } from "./CheckoutButton";
import type { UserPlanT } from "@/lib/api";

/**
 * Phase L9 — Pricing-Pivot.
 *
 * Zwei Karten: Beobachter (Free) + Investor Club (19 €/Mo, 190 €/Jahr).
 * Verkaeufer-Pro entfaellt; Verkaeufer/Vermieter inserieren in der
 * Wachstumsphase generell kostenlos. Bestandskunden auf SELLER_PRO
 * laufen am Periodenende automatisch auf FREE.
 *
 * Tonalitaet: Mitgliedschaft im Investment-Club, nicht "SaaS-Plan".
 */

type Interval = "monthly" | "yearly";

const FREE_FEATURES = [
  { label: "Inseriere als Verkäufer oder Vermieter — unbegrenzt", bold: true },
  { label: "Durchsuche den öffentlichen Marktplatz" },
  { label: "Lege Watchlist-Objekte an" },
  { label: "Eigenes Profil mit Verifizierung" }
];

const INVESTOR_FEATURES: { label: string; bold?: boolean }[] = [
  { label: "Off-Market-Deals zuerst — 4–7 Tage Vorsprung", bold: true },
  { label: "KI-Bietlimit pro Objekt — du bietest nie zu viel, nie zu wenig", bold: true },
  { label: "Marktvergleich auf Knopfdruck — Yield, Mietmultiplikator, WALT" },
  { label: "Verifiziert-Badge — Verkäufer nehmen deine Anfragen häufiger an" },
  { label: "Investor-Profil mit Trackrecord — du wirst sichtbar, nicht nur ein Name" },
  { label: "Unbegrenzte Anfragen — kein Tageslimit, kein Stress" }
];

const INVESTOR_PRICE_MONTHLY = 19;
const INVESTOR_PRICE_YEARLY = 190;

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

type Props = {
  currentPlan: UserPlanT;
  stripeReady: boolean;
};

export function PricingTable({ currentPlan, stripeReady }: Props) {
  const [interval, setInterval] = useState<Interval>("monthly");

  const investorPrice =
    interval === "monthly" ? INVESTOR_PRICE_MONTHLY : INVESTOR_PRICE_YEARLY;
  const isCurrentInvestor = currentPlan === "INVESTOR_PRO";

  return (
    <div className="space-y-8">
      {/* Toggle Monatlich/Jährlich */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setInterval("monthly")}
            className={
              interval === "monthly"
                ? "rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white"
                : "rounded-full px-4 py-1.5 text-sm text-zinc-600 hover:text-zinc-900"
            }
          >
            Monatlich
          </button>
          <button
            type="button"
            onClick={() => setInterval("yearly")}
            className={
              interval === "yearly"
                ? "rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white"
                : "rounded-full px-4 py-1.5 text-sm text-zinc-600 hover:text-zinc-900"
            }
          >
            Jährlich{" "}
            <span className="ml-1 text-[10px] uppercase tracking-wide text-emerald-600">
              −2 Monate
            </span>
          </button>
        </div>
      </div>

      {/* Zwei Karten — Investor Club zentral hervorgehoben */}
      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        {/* Beobachter (Free) — zurueckhaltend */}
        <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-base font-semibold text-zinc-900">Beobachter</div>
          <div className="mt-1 text-xs text-zinc-500">
            Markt verstehen, ohne Risiko anfangen.
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight text-zinc-900">
              Kostenlos
            </span>
            <span className="text-xs text-zinc-500">· dauerhaft</span>
          </div>

          <ul className="mt-5 flex-1 space-y-2 text-sm">
            {FREE_FEATURES.map((f) => (
              <FeatureRow key={f.label} label={f.label} bold={f.bold} />
            ))}
          </ul>

          <div className="mt-6">
            <button
              type="button"
              disabled
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-400"
            >
              {currentPlan === "FREE" ? "Aktueller Plan" : "Über Abo verwalten"}
            </button>
          </div>
        </div>

        {/* Investor Club — hervorgehoben */}
        <div className="relative flex flex-col rounded-2xl border-2 border-indigo-500 bg-white p-6 shadow-lg ring-4 ring-indigo-100">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow">
            Am beliebtesten
          </span>

          <div className="text-base font-semibold text-zinc-900">Investor Club</div>
          <div className="mt-1 text-xs text-zinc-500">
            Der Vorsprung, den 80 % der Käufer übersehen.
          </div>

          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight text-zinc-900">
              {eur(investorPrice)}
            </span>
            <span className="text-xs text-zinc-500">
              /{interval === "monthly" ? "Monat" : "Jahr"}
            </span>
          </div>
          {interval === "yearly" ? (
            <div className="mt-1 text-[11px] text-emerald-700">
              Spart 38 € gegenüber monatlich.
            </div>
          ) : (
            <div className="mt-1 text-[11px] text-zinc-500">
              Oder 190 €/Jahr — 2 Monate gratis.
            </div>
          )}

          <ul className="mt-5 flex-1 space-y-2 text-sm">
            {INVESTOR_FEATURES.map((f) => (
              <FeatureRow key={f.label} label={f.label} bold={f.bold} />
            ))}
          </ul>

          <div className="mt-6">
            <CheckoutButton
              plan="INVESTOR_PRO"
              interval={interval}
              label={
                isCurrentInvestor
                  ? "Plan ändern"
                  : "Jetzt Mitglied werden"
              }
              variant="primary"
              disabledReason={
                !stripeReady
                  ? "Stripe noch nicht konfiguriert"
                  : isCurrentInvestor
                  ? "Aktueller Plan"
                  : null
              }
            />
            <div className="mt-2 text-center text-[11px] text-zinc-500">
              Monatlich kündbar · SEPA · Karte · Apple Pay
            </div>
          </div>
        </div>
      </div>

      {/* Trust-Strip */}
      <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 sm:grid-cols-3">
        <TrustStat
          big="1.200+"
          small="Off-Market-Objekte analysiert"
        />
        <TrustStat
          big="Ø 4,2 %"
          small="präzisere Bietlimits dank KI-Modell"
        />
        <TrustStat
          big="AGG-konform"
          small="Anti-Diskriminierung by design"
        />
      </div>

      {/* Footnote */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-xs text-zinc-600">
        Alle Preise inkl. MwSt. Monatlich kündbar zum Ende der Laufzeit.
        Jahresplan spart 2 Monate. Verkäufer und Vermieter inserieren in
        der Wachstumsphase kostenlos — keine Listing-Limits, keine
        versteckten Kosten.
      </div>
    </div>
  );
}

function FeatureRow({ label, bold }: { label: string; bold?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <svg
        className="mt-0.5 shrink-0 text-emerald-600"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span className={bold ? "font-semibold text-zinc-900" : "text-zinc-700"}>
        {label}
      </span>
    </li>
  );
}

function TrustStat({ big, small }: { big: string; small: string }) {
  return (
    <div className="text-center">
      <div className="text-xl font-bold text-zinc-900">{big}</div>
      <div className="mt-0.5 text-[11px] text-zinc-600">{small}</div>
    </div>
  );
}
