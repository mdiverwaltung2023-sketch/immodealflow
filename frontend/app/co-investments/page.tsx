import Link from "next/link";
import {
  CoInvestRequestListSchema,
  CoInvestMarketListSchema,
  CoInvestFeedSchema,
  COINVEST_STATUS_LABELS,
  INVEST_STRATEGY_LABELS,
  ASSET_TYPE_LABELS,
  type CoInvestRequestT,
  type CoInvestMarketItemT
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { NewGesuchForm } from "./NewGesuchForm";
import { PublishButtons } from "./PublishButtons";

export const dynamic = "force-dynamic";

function eur(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function assetLabel(t: string | null | undefined): string {
  if (!t) return "—";
  return (ASSET_TYPE_LABELS as Record<string, string>)[t] ?? t;
}

function ownerLabel(o: CoInvestMarketItemT["owner"]): string {
  return o.name ?? o.label ?? "Investor";
}

export default async function CoInvestmentsPage() {
  await requireOnboardedUser();

  const [own, market, feed] = await Promise.all([
    apiGet("/me/coinvest-requests", CoInvestRequestListSchema).catch(() => [] as CoInvestRequestT[]),
    apiGet("/coinvest/marketplace", CoInvestMarketListSchema).catch(() => [] as CoInvestMarketItemT[]),
    apiGet("/coinvest/feed", CoInvestFeedSchema).catch(() => ({ hasProfile: false, count: 0, matches: [] as const }))
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Co-Investment Hub</h1>
        <p className="mt-1 text-sm text-slate-600">
          Veröffentliche Co-Investment-Gesuche und finde passende Kapitalpartner. Oikos stellt nur den
          Kontakt her — keine Anlagevermittlung, keine Kapitalabwicklung. Die Prüfung und der Abschluss
          liegen allein bei den Beteiligten.
        </p>
      </header>

      {/* Neues Gesuch */}
      <section className="mb-10 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Neues Gesuch anlegen</h2>
        <NewGesuchForm />
      </section>

      {/* Eigene Gesuche */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Meine Gesuche</h2>
        {own.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Gesuche. Lege oben dein erstes an.</p>
        ) : (
          <ul className="space-y-3">
            {own.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium text-slate-900">{r.title}</span>
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {COINVEST_STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  <PublishButtons id={r.id} status={r.status} />
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600 sm:grid-cols-4">
                  <div><dt className="text-xs text-slate-400">Objektart</dt><dd>{assetLabel(r.assetType)}</dd></div>
                  <div><dt className="text-xs text-slate-400">Standort</dt><dd>{r.location || "—"}</dd></div>
                  <div><dt className="text-xs text-slate-400">Kapitalbedarf</dt><dd>{eur(r.capitalNeed)}</dd></div>
                  <div><dt className="text-xs text-slate-400">Rendite-Erw.</dt><dd>{r.targetReturnPct != null ? `${r.targetReturnPct} %` : "—"}</dd></div>
                </dl>
                <Link href={`/co-investments/${r.id}`} className="mt-2 inline-block text-sm font-medium text-teal-700 hover:underline">
                  Passende Kapitalgeber ansehen →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Personalisierter Feed */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Für mich passende Gesuche</h2>
        {!feed.hasProfile ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Lege ein Investor-Profil an (Eigenkapital, Asset-Klassen, Regionen, Ticketgröße), um
            personalisierte Matches zu sehen.{" "}
            <Link href="/profil" className="font-medium underline">Profil bearbeiten</Link>
          </p>
        ) : feed.matches.length === 0 ? (
          <p className="text-sm text-slate-500">Aktuell keine passenden Gesuche. Schau später wieder vorbei.</p>
        ) : (
          <ul className="space-y-3">
            {feed.matches.map((m) => (
              <li key={m.request.id} className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-4">
                <ScoreBadge score={m.score} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900">{m.request.title}</div>
                  <div className="text-sm text-slate-600">
                    {assetLabel(m.request.assetType)} · {m.request.location || "—"} · Bedarf {eur(m.request.capitalNeed)}
                    {m.request.strategy ? ` · ${INVEST_STRATEGY_LABELS[m.request.strategy]}` : ""}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">von {ownerLabel(m.request.owner)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Marktplatz */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Marktplatz — alle aktiven Gesuche</h2>
        {market.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine veröffentlichten Gesuche.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {market.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="font-medium text-slate-900">{r.title}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {assetLabel(r.assetType)} · {r.location || "—"}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 text-sm text-slate-600">
                  <div><span className="text-xs text-slate-400">Kaufpreis</span><br />{eur(r.purchasePrice)}</div>
                  <div><span className="text-xs text-slate-400">Kapitalbedarf</span><br />{eur(r.capitalNeed)}</div>
                </div>
                <div className="mt-2 text-xs text-slate-400">von {ownerLabel(r.owner)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 border-t border-slate-100 pt-4 text-xs text-slate-400">
        Hinweis: Infinity Oikos ist eine reine Kontakt- und Matching-Plattform. Es findet keine
        Anlageberatung, Anlagevermittlung oder Kapitalabwicklung statt. Alle Angaben sind
        eigenverantwortlich zu prüfen.
      </p>
    </main>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 75 ? "bg-teal-600" : score >= 50 ? "bg-teal-500" : score >= 30 ? "bg-amber-500" : "bg-slate-400";
  return (
    <div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg text-white ${tone}`}>
      <span className="text-sm font-bold leading-none">{score}</span>
      <span className="text-[9px] uppercase tracking-wide">Match</span>
    </div>
  );
}
