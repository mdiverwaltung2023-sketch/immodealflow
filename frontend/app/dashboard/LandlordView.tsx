"use client";

import Link from "next/link";

/**
 * Vermieter-Sicht des Dashboards (Phase L5.2):
 * - Quick-Actions auf Mietobjekte / Bewerbungen / KI-Bewertung / neues Objekt
 * - Anti-Diskriminierungs-Hinweis prominent oben (AGG)
 * - Hint-Card mit den drei USP gegen Immoscout/Immowelt
 *
 * V1 zeigt aktuell nur Quick-Actions + Erklärung. KPIs (offene
 * Bewerbungen, leere Wohnungen, anstehende Besichtigungen) folgen
 * in L5.3+, sobald die erweiterten Endpunkte da sind.
 */
export function LandlordView() {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <span className="font-semibold">Anti-Diskriminierung:</span> Die Plattform
        erfasst und bewertet keine sensiblen Merkmale (Herkunft, Religion,
        Geschlecht, sexuelle Orientierung, Alter, Behinderung, Familienstand).
        Die KI-Bewertung berücksichtigt ausschließlich wirtschaftliche und
        organisatorische Faktoren.
      </div>

      {/* Quick-Actions Vermieter */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickAction
          href="/rentals"
          title="Mietobjekte"
          subtitle="Übersicht & Status"
          accent="indigo"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <circle cx="8" cy="15" r="4" />
              <path d="M11 12l9-9" />
              <path d="M16 7l3 3" />
            </svg>
          }
        />
        <QuickAction
          href="/rentals/new"
          title="Neues Mietobjekt"
          subtitle="Inserat anlegen"
          accent="emerald"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M12 5v14" /><path d="M5 12h14" />
            </svg>
          }
        />
        <QuickAction
          href="/rentals"
          title="Bewerbungen"
          subtitle="Eingehende Anfragen"
          accent="amber"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5 4h14l3 8v8H2v-8z" />
            </svg>
          }
        />
        <QuickAction
          href="/rentals"
          title="KI-Bewertung"
          subtitle="Bewerber prüfen lassen"
          accent="rose"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <circle cx="12" cy="12" r="9" />
              <path d="M9 11l2 2 4-4" />
            </svg>
          }
        />
      </div>

      {/* USP-Hinweis */}
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
        <div className="text-sm font-semibold text-indigo-900">
          Was Infinity Oikos für Vermieter besser macht
        </div>
        <ul className="mt-2 space-y-1 text-xs text-indigo-800">
          <li>• Strukturierte Bewerbungen statt Mail-Chaos</li>
          <li>• KI-Vorab-Bewertung neutral nach AGG-Kriterien</li>
          <li>• Bewerber-Dokumente (Gehaltsnachweise, SCHUFA) zentral</li>
          <li>• Anonymisierte Adresse — Vermieter behält die Kontrolle</li>
        </ul>
      </div>
    </div>
  );
}

function QuickAction({
  href, title, subtitle, icon, accent
}: {
  href: string; title: string; subtitle: string;
  icon: React.ReactNode; accent: "indigo" | "emerald" | "amber" | "rose";
}) {
  const accents = {
    indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    rose: "bg-rose-50 text-rose-600 ring-rose-100"
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
        <div className="text-sm font-semibold text-zinc-900 group-hover:text-indigo-700">{title}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{subtitle}</div>
      </div>
    </Link>
  );
}
