"use client";

import { useState } from "react";
import { CheckoutButton } from "./CheckoutButton";
import type { UserPlanT } from "@/lib/api";

type Plan = {
  id: Exclude<UserPlanT, "FREE">;
  name: string;
  monthly: number;
  yearly: number;
  tagline: string;
  features: { label: string; bold?: boolean }[];
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "INVESTOR_PRO",
    name: "Investor Pro",
    monthly: 99,
    yearly: 990,
    tagline: "Für Käufer, die ernsthaft suchen — Off-Market und KI-Tools.",
    highlight: true,
    features: [
      { label: "Unlimitiert Anfragen stellen", bold: true },
      { label: "Off-Market-Inserate sichtbar", bold: true },
      { label: "Verifiziert-Badge (KYC + Bonität geprüft)", bold: true },
      { label: "Bietlimit-Schnellrechner" },
      { label: "KI-Marktvergleich (Claude)" },
      { label: "Watchlist mit E-Mail-Alerts" },
      { label: "Mietspiegel-Vergleiche" }
    ]
  },
  {
    id: "SELLER_PRO",
    name: "Verkäufer Pro",
    monthly: 49,
    yearly: 490,
    tagline: "Für Eigentümer und Makler mit mehreren Inseraten.",
    features: [
      { label: "Bis zu 10 aktive Inserate", bold: true },
      { label: "Premium-Hervorhebung in der Suche", bold: true },
      { label: "Anbieter-Statistiken (Views, Match-Rate)" },
      { label: "Verifizierter-Anbieter-Badge" },
      { label: "AI-Exposé-Optimierung" },
      { label: "Push an passende Investor-Profile" }
    ]
  }
];

const FREE_FEATURES = [
  "1 aktives Inserat",
  "3 Anfragen pro Monat",
  "Basis-Marktansicht",
  "Standard-Anonymisierung"
];

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
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="space-y-8">
      {/* Toggle */}
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
            Jährlich <span className="ml-1 text-[10px] uppercase tracking-wide text-emerald-600">−2 Monate</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Free */}
        <PlanCard
          name="Free"
          tagline="Zum Reinschnuppern."
          price={0}
          interval={interval}
          features={FREE_FEATURES.map((f) => ({ label: f }))}
          ctaLabel={currentPlan === "FREE" ? "Aktueller Plan" : "Downgrade über Abo verwalten"}
          ctaDisabled
        />

        {PLANS.map((plan) => {
          const price = interval === "monthly" ? plan.monthly : plan.yearly;
          const isCurrent = currentPlan === plan.id;
          return (
            <PlanCard
              key={plan.id}
              name={plan.name}
              tagline={plan.tagline}
              price={price}
              interval={interval}
              features={plan.features}
              highlight={plan.highlight}
              ctaSlot={
                <CheckoutButton
                  plan={plan.id}
                  interval={interval}
                  label={isCurrent ? "Plan ändern" : `${plan.name} starten`}
                  variant={plan.highlight ? "primary" : "secondary"}
                  disabledReason={
                    !stripeReady
                      ? "Stripe noch nicht konfiguriert"
                      : isCurrent
                      ? "Aktueller Plan"
                      : null
                  }
                />
              }
            />
          );
        })}
      </div>

      {/* Footnote */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600">
        Alle Preise inkl. MwSt. Monatlich kündbar zum Ende der Laufzeit.
        Jährliche Zahlung spart 2 Monate. Test-Phase mit Stripe-Test-Karten:{" "}
        <code className="rounded bg-white border border-zinc-200 px-1 py-0.5 font-mono text-[10px]">4242 4242 4242 4242</code>.
      </div>
    </div>
  );

  function PlanCard({
    name,
    tagline,
    price,
    interval,
    features,
    ctaLabel,
    ctaSlot,
    ctaDisabled,
    highlight
  }: {
    name: string;
    tagline: string;
    price: number;
    interval: "monthly" | "yearly";
    features: { label: string; bold?: boolean }[];
    ctaLabel?: string;
    ctaSlot?: React.ReactNode;
    ctaDisabled?: boolean;
    highlight?: boolean;
  }) {
    return (
      <div
        className={
          highlight
            ? "relative flex flex-col rounded-2xl border-2 border-indigo-500 bg-white p-6 shadow-lg ring-4 ring-indigo-100"
            : "flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        }
      >
        {highlight ? (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow">
            Empfohlen
          </span>
        ) : null}
        <div className="text-base font-semibold text-zinc-900">{name}</div>
        <div className="mt-1 text-xs text-zinc-500">{tagline}</div>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight text-zinc-900">
            {price === 0 ? "Kostenlos" : eur(price)}
          </span>
          {price > 0 ? (
            <span className="text-xs text-zinc-500">
              /{interval === "monthly" ? "Monat" : "Jahr"}
            </span>
          ) : null}
        </div>

        <ul className="mt-5 flex-1 space-y-2 text-sm">
          {features.map((f) => (
            <li key={f.label} className="flex items-start gap-2">
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
              <span className={f.bold ? "font-semibold text-zinc-900" : "text-zinc-700"}>
                {f.label}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          {ctaSlot ? (
            ctaSlot
          ) : (
            <button
              type="button"
              disabled={ctaDisabled}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-400"
            >
              {ctaLabel}
            </button>
          )}
        </div>
      </div>
    );
  }
}
