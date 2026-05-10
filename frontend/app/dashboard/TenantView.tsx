"use client";

import Link from "next/link";

/**
 * Mieter-Sicht des Dashboards (Phase L7):
 * - Quick-Actions auf Mietboerse / Eigene Bewerbungen / Profil
 * - Klarer USP-Hinweis: warum sich hier zu bewerben besser ist
 *
 * V1 zeigt nur Quick-Actions + Erklaerung. KPIs (eigene Bewerbungs-
 * Status, Antworten von Vermietern) folgen sobald die Endpunkte
 * dafuer da sind.
 */
export function TenantView() {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-xs text-cyan-900">
        <span className="font-semibold">Mieter-Sicht.</span> Du suchst eine
        Mietwohnung. Stöbere durch die öffentliche Mietbörse und bewirb dich
        direkt mit deinem Profil — ohne Anschreiben oder Massen-Mail-Chaos.
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <QuickAction
          href="/rental-marketplace"
          title="Mietbörse"
          subtitle="Verfügbare Wohnungen durchsuchen"
          accent="indigo"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M3 9l1.5-5h15L21 9" />
              <path d="M4 9v11h16V9" />
              <path d="M9 20v-6h6v6" />
            </svg>
          }
        />
        <QuickAction
          href="/me/applications-sent"
          title="Meine Bewerbungen"
          subtitle="Status deiner Anfragen"
          accent="amber"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M22 12h-6l-2 3h-4l-2-3H2" />
              <path d="M5 4h14l3 8v8H2v-8z" />
            </svg>
          }
        />
        <QuickAction
          href="/profile"
          title="Mein Profil"
          subtitle="Daten für Bewerbungen pflegen"
          accent="emerald"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
            </svg>
          }
        />
      </div>

      <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
        <div className="text-sm font-semibold text-cyan-900">
          Warum hier bewerben?
        </div>
        <ul className="mt-2 space-y-1 text-xs text-cyan-800">
          <li>• Strukturierte Bewerbung — alle relevanten Daten in einem Formular</li>
          <li>• Vermieter sieht deine Eckdaten sofort (Bonität, Beruf, Haushalt)</li>
          <li>• AGG-konform: keine sensiblen Merkmale, faire Vorab-Bewertung</li>
          <li>• Adressen anonym — Vermieter teilt sie erst bei Freigabe</li>
        </ul>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  title,
  subtitle,
  icon,
  accent
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: "indigo" | "emerald" | "amber" | "cyan";
}) {
  const accents = {
    indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    cyan: "bg-cyan-50 text-cyan-600 ring-cyan-100"
  } as const;
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-zinc-300"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${accents[accent]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-900 group-hover:text-indigo-700">
          {title}
        </div>
        <div className="text-xs text-zinc-500 mt-0.5">{subtitle}</div>
      </div>
    </Link>
  );
}
