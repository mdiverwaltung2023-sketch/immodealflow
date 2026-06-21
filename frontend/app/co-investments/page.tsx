import Link from "next/link";
import {
  CoInvestRequestListSchema,
  CoInvestMarketListSchema,
  CoInvestFeedSchema,
  ASSET_TYPE_LABELS,
  INVEST_STRATEGY_LABELS,
  type CoInvestRequestT,
  type CoInvestMarketItemT
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { CoInvestVisual } from "./CoInvestVisual";
import { MarketplaceExplorer } from "./MarketplaceExplorer";

export const dynamic = "force-dynamic";

function eur(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
function assetLabel(t: string | null | undefined): string {
  if (!t) return "—";
  return (ASSET_TYPE_LABELS as Record<string, string>)[t] ?? t;
}

export default async function CoInvestmentsPage() {
  await requireOnboardedUser();

  const [own, market, feed] = await Promise.all([
    apiGet("/me/coinvest-requests", CoInvestRequestListSchema).catch(() => [] as CoInvestRequestT[]),
    apiGet("/coinvest/marketplace", CoInvestMarketListSchema).catch(() => [] as CoInvestMarketItemT[]),
    apiGet("/coinvest/feed", CoInvestFeedSchema).catch(() => ({ hasProfile: false, count: 0, matches: [] as const }))
  ]);

  const topMatches = feed.hasProfile ? feed.matches.slice(0, 3) : [];

  return (
    <main className="w-full px-4 py-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-900 p-7 text-white shadow-lg sm:p-9">
        <svg className="pointer-events-none absolute -right-8 -top-8 h-56 w-56 text-white/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
        </svg>
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] backdrop-blur-sm">
            Co-Investment Hub
          </span>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
            Finde Partner für deine Immobilien-Deals
          </h1>
          <p className="mt-2 max-w-xl text-sm text-teal-50/90 sm:text-base">
            Veröffentliche konkrete Objekte oder eine allgemeine Suche und finde passende Kapitalpartner.
            Oikos stellt nur den Kontakt her — keine Anlagevermittlung, keine Kapitalabwicklung.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/co-investments/neu"
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50">
              + Gesuch anlegen
            </Link>
            <Link href="/co-investments/meine"
              className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
              Meine Gesuche ({own.length})
            </Link>
          </div>
        </div>
      </section>

      {/* Personalisierter Feed */}
      <section className="mt-9">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Für dich passende Gesuche</h2>
        </div>
        {!feed.hasProfile ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Lege ein Investor-Profil an (Eigenkapital, Asset-Klassen, Regionen, Ticketgröße), um
            personalisierte Matches zu sehen.{" "}
            <Link href="/profile" className="font-medium underline">Profil bearbeiten</Link>
          </p>
        ) : topMatches.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Aktuell keine passenden Gesuche. Schau später wieder vorbei.
          </p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {topMatches.map((m) => (
              <li key={m.request.id}
                className="overflow-hidden rounded-2xl border border-teal-200 bg-white shadow-sm">
                <div className="relative">
                  <CoInvestVisual imageUrl={m.request.imageUrl} assetType={m.request.assetType} title={m.request.title} heightCls="h-32" />
                  <div className="absolute right-3 top-3 flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-white/95 shadow">
                    <span className="text-sm font-bold leading-none text-teal-700">{m.score}</span>
                    <span className="text-[8px] font-semibold uppercase text-slate-400">Match</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-1 font-semibold text-slate-900">{m.request.title}</h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {assetLabel(m.request.assetType)}{m.request.location ? ` · ${m.request.location}` : ""}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-teal-700">{eur(m.request.capitalNeed)}</span>
                    {m.request.strategy && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {INVEST_STRATEGY_LABELS[m.request.strategy]}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Marktplatz */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Marktplatz</h2>
        <MarketplaceExplorer items={market} />
      </section>

      <p className="mt-10 border-t border-slate-100 pt-4 text-xs text-slate-400">
        Hinweis: Infinity Oikos ist eine reine Kontakt- und Matching-Plattform. Es findet keine
        Anlageberatung, Anlagevermittlung oder Kapitalabwicklung statt. Alle Angaben sind
        eigenverantwortlich zu prüfen.
      </p>
    </main>
  );
}
