import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CoInvestRequestSchema,
  CoInvestMatchesSchema,
  ASSET_TYPE_LABELS,
  INVEST_STRATEGY_LABELS,
  COINVEST_KIND_LABELS
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { CoInvestVisual } from "../CoInvestVisual";
import { TrustBadge } from "@/components/TrustBadge";

export const dynamic = "force-dynamic";

function eur(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
function assetLabel(t: string | null | undefined): string {
  if (!t) return "—";
  return (ASSET_TYPE_LABELS as Record<string, string>)[t] ?? t;
}
const PART_LABELS: Record<string, string> = {
  region: "Region", assetType: "Objektart", volume: "Volumen",
  strategy: "Strategie", return: "Rendite", experience: "Erfahrung"
};

export default async function CoInvestDetailPage({ params }: { params: { id: string } }) {
  await requireOnboardedUser();

  const request = await apiGet(`/me/coinvest-requests/${params.id}`, CoInvestRequestSchema).catch(() => null);
  if (!request) notFound();

  const matches = await apiGet(`/me/coinvest-requests/${params.id}/matches`, CoInvestMatchesSchema)
    .catch(() => ({ requestId: params.id, count: 0, matches: [] as const }));

  return (
    <main className="w-full px-4 py-8">
      <Link href="/co-investments" className="text-sm text-teal-700 hover:underline">← Zurück zum Hub</Link>

      <div className="relative mt-3 overflow-hidden rounded-2xl border border-slate-200">
        <CoInvestVisual imageUrl={request.imageUrl} assetType={request.assetType} title={request.title} heightCls="h-44" rounded="" />
        <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-teal-700 shadow-sm">
          {COINVEST_KIND_LABELS[request.kind]}
        </span>
      </div>

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{request.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {assetLabel(request.assetType)} · {request.location || "—"}
          {request.strategy ? ` · ${INVEST_STRATEGY_LABELS[request.strategy]}` : ""}
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
        <Fact label="Kaufpreis" value={eur(request.purchasePrice)} />
        <Fact label="Eigenkapital" value={eur(request.equityAvailable)} />
        <Fact label="Kapitalbedarf" value={eur(request.capitalNeed)} />
        <Fact label="Rendite-Erw." value={request.targetReturnPct != null ? `${request.targetReturnPct} %` : "—"} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Passende Kapitalgeber {matches.count > 0 ? `(${matches.count})` : ""}
        </h2>
        {matches.matches.length === 0 ? (
          <p className="text-sm text-slate-500">
            Noch keine passenden Kapitalgeber gefunden. Sobald Investoren mit passendem Profil im Netzwerk
            sind, erscheinen sie hier — sortiert nach Match-Score.
          </p>
        ) : (
          <ul className="space-y-3">
            {matches.matches.map((m, i) => (
              <li key={i} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-teal-600 text-white">
                    <span className="text-sm font-bold leading-none">{m.score}</span>
                    <span className="text-[9px] uppercase">Match</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {m.capitalGiver.name ?? m.capitalGiver.label ?? "Verifizierter Investor"}
                      </span>
                      {m.capitalGiver.trustTier ? (
                        <TrustBadge tier={m.capitalGiver.trustTier} score={m.capitalGiver.trustScore} />
                      ) : null}
                    </div>
                    <div className="text-sm text-slate-600">
                      Ticket {eur(m.capitalGiver.minTicketSize)} – {eur(m.capitalGiver.maxTicketSize)}
                      {m.capitalGiver.experienceYears != null ? ` · ${m.capitalGiver.experienceYears} J. Erfahrung` : ""}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(m.parts).map(([k, v]) => (
                        <span key={k} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {PART_LABELS[k] ?? k}: {Math.round((v as number) * 100)}%
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 border-t border-slate-100 pt-4 text-xs text-slate-400">
        Match-Scores sind eine algorithmische Orientierung (Region, Objektart, Volumen, Strategie, Rendite,
        Erfahrung). Kontaktaufnahme und Prüfung erfolgen eigenverantwortlich. Oikos vermittelt nur den Kontakt.
      </p>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
