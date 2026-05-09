"use client";

import Link from "next/link";
import {
  SALE_STAGE_LABELS,
  SALE_STAGE_ORDER,
  type ListingT,
  type SaleProcessListItemT,
  type InquiryReceivedT,
  type SaleStageT
} from "@/lib/api";

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

/**
 * Verkäufer-Sicht des Dashboards (Phase J5):
 * Aktive Inserate, offene PENDING-Anfragen, laufende Verkaufsprozesse
 * pro Stage, Quick-Actions auf "Inserat anlegen", "Anfragen", "Verkäufe".
 * Investor-spezifische Items (Pipeline-Wert, ZVG-Tile, Verhandlung-Counts
 * von Watchlist) sind ausgeblendet.
 */
export function SellerView({
  myListings,
  saleProcesses,
  pendingInquiries
}: {
  myListings: ListingT[];
  saleProcesses: SaleProcessListItemT[];
  pendingInquiries: InquiryReceivedT[];
}) {
  const activeListings = myListings.filter((l) => l.status === "ACTIVE");
  const draftListings = myListings.filter((l) => l.status === "DRAFT");
  const inNegotiation = myListings.filter((l) => l.status === "IN_NEGOTIATION");
  const sold = myListings.filter((l) => l.status === "SOLD");

  const activeProcesses = saleProcesses.filter(
    (p) => p.currentStage !== "ABGESCHLOSSEN" && p.currentStage !== "ABGEBROCHEN"
  );

  // Wert der aktiven Verkaufs-Pipeline (vereinbarter Preis, sonst Listing-Preis)
  const pipelineValue = activeProcesses.reduce(
    (s, p) => s + (p.agreedPrice ?? p.listing.askingPrice ?? 0),
    0
  );

  // Stage-Verteilung
  const stageCounts: Partial<Record<SaleStageT, number>> = {};
  activeProcesses.forEach((p) => {
    stageCounts[p.currentStage] = (stageCounts[p.currentStage] ?? 0) + 1;
  });

  // Letzte 6 eigene Inserate als Tiles
  const tileListings = [...myListings]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Quick-Actions Verkäufer */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickAction
          href="/listings/new"
          title="Neues Inserat"
          subtitle="Immobilie inserieren"
          accent="indigo"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M3 9l9-6 9 6" /><path d="M5 9v11h14V9" /><path d="M12 14v4" /><path d="M10 16h4" />
            </svg>
          }
        />
        <QuickAction
          href="/listings"
          title="Meine Inserate"
          subtitle={`${activeListings.length} aktiv · ${draftListings.length} Entwurf`}
          accent="emerald"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" />
              <circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" />
            </svg>
          }
        />
        <QuickAction
          href="/sales"
          title="Verkaufsabwicklung"
          subtitle={`${activeProcesses.length} laufend`}
          accent="amber"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <rect x="3" y="7" width="18" height="13" rx="2" />
              <path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
              <path d="M3 12h18" />
            </svg>
          }
        />
        <QuickAction
          href="#anfragen"
          title="Offene Anfragen"
          subtitle={`${pendingInquiries.length} unbeantwortet`}
          accent="rose"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5 4h14l3 8v8H2v-8z" />
            </svg>
          }
        />
      </div>

      {/* KPIs */}
      <div className="grid gap-4 lg:grid-cols-3">
        <HeroKpi
          label="Pipeline-Wert (Verkauf)"
          value={pipelineValue > 0 ? eur(pipelineValue) : "—"}
          hint={`${activeProcesses.length} laufende Verkäufe`}
        />
        <Kpi
          label="Aktive Inserate"
          value={activeListings.length.toString()}
          hint={`${draftListings.length} Entwurf · ${inNegotiation.length} verhandeln`}
        />
        <Kpi
          label="Offene Anfragen"
          value={pendingInquiries.length.toString()}
          hint={`${sold.length} Inserate verkauft (gesamt)`}
        />
      </div>

      {/* Stages-Verteilung — ein Mini pro Stage, das aktiv ist */}
      <div>
        <div className="mb-3 text-sm font-semibold text-zinc-900">
          Verkäufe nach Status
        </div>
        {activeProcesses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-5 text-center text-sm text-zinc-500">
            Noch keine laufenden Verkaufsprozesse.{" "}
            <Link
              href="/sales"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              Verkaufsabwicklung öffnen
            </Link>{" "}
            oder eine Anfrage akzeptieren.
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            {SALE_STAGE_ORDER.map((stage) => {
              const c = stageCounts[stage] ?? 0;
              if (c === 0) return null;
              return (
                <div
                  key={stage}
                  className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3"
                >
                  <div className="text-[10px] font-medium uppercase tracking-wider text-indigo-700">
                    {SALE_STAGE_LABELS[stage]}
                  </div>
                  <div className="mt-1 text-xl font-semibold text-zinc-900">{c}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Offene Anfragen */}
      <div id="anfragen" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div className="text-lg font-semibold text-zinc-900">
            Offene Anfragen ({pendingInquiries.length})
          </div>
          <Link
            href="/listings"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Inserate öffnen →
          </Link>
        </div>
        {pendingInquiries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-5 text-center text-sm text-zinc-500">
            Aktuell keine unbeantworteten Anfragen.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
            {pendingInquiries.slice(0, 6).map((inq) => (
              <li key={inq.id} className="px-4 py-3">
                <Link
                  href={`/listings/${inq.listingId}/inquiries`}
                  className="block hover:text-indigo-700"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="text-sm font-medium text-zinc-900">
                      {inq.listing.title}{" "}
                      <span className="text-xs text-zinc-500">
                        · {inq.listing.city}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(inq.createdAt).toLocaleDateString("de-DE")}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-600 line-clamp-2">
                    {inq.message}
                  </div>
                  <div className="mt-1 text-[10px] text-zinc-400">
                    von {inq.investor.name ?? "Investor"}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Eigene Inserate als Mini-Tiles */}
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div className="text-lg font-semibold text-zinc-900">Meine Inserate</div>
          <Link
            href="/listings"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Alle ansehen →
          </Link>
        </div>
        {tileListings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-5 text-center text-sm text-zinc-500">
            Noch keine Inserate.{" "}
            <Link
              href="/listings/new"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              Erstes Inserat anlegen
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {tileListings.map((l) => (
              <Link
                key={l.id}
                href={`/listings/${l.id}/edit`}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-zinc-300"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-sm font-semibold text-zinc-900 line-clamp-1">
                    {l.title}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      l.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700"
                        : l.status === "DRAFT"
                          ? "bg-zinc-100 text-zinc-700"
                          : l.status === "IN_NEGOTIATION"
                            ? "bg-amber-50 text-amber-800"
                            : l.status === "SOLD"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {l.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-zinc-500">{l.city}</div>
                <div className="mt-2 text-base font-bold tabular-nums text-zinc-900">
                  {eur(l.askingPrice)}
                </div>
              </Link>
            ))}
          </div>
        )}
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

function HeroKpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border-2 border-indigo-200 bg-white p-5 shadow-sm lg:col-span-1">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-zinc-500">{hint}</div> : null}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-zinc-500">{hint}</div> : null}
    </div>
  );
}
