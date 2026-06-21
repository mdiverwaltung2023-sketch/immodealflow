import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CoInvestMarketDetailSchema,
  ASSET_TYPE_LABELS,
  INVEST_STRATEGY_LABELS,
  COINVEST_KIND_LABELS
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { CoInvestVisual } from "../../CoInvestVisual";
import { InterestButton } from "../../InterestButton";

export const dynamic = "force-dynamic";

function eur(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
function assetLabel(t: string | null | undefined): string {
  if (!t) return "—";
  return (ASSET_TYPE_LABELS as Record<string, string>)[t] ?? t;
}

export default async function MarketDetailPage({ params }: { params: { id: string } }) {
  await requireOnboardedUser();
  const r = await apiGet(`/coinvest/marketplace/${params.id}`, CoInvestMarketDetailSchema).catch(() => null);
  if (!r) notFound();

  return (
    <main className="w-full px-4 py-8">
      <Link href="/co-investments" className="text-sm text-teal-700 hover:underline">← Zum Marktplatz</Link>

      <div className="relative mt-3 overflow-hidden rounded-2xl border border-slate-200">
        <CoInvestVisual imageUrl={r.imageUrl} assetType={r.assetType} title={r.title} heightCls="h-52" rounded="" />
        <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-teal-700 shadow-sm">
          {COINVEST_KIND_LABELS[r.kind]}
        </span>
      </div>

      <header className="mt-4">
        <h1 className="text-2xl font-bold text-slate-900">{r.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {assetLabel(r.assetType)} · {r.location || "—"}
          {r.strategy ? ` · ${INVEST_STRATEGY_LABELS[r.strategy]}` : ""} · {r.owner.name ?? r.owner.label ?? "Investor"}
        </p>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
        {r.kind === "OBJECT" && <Fact label="Kaufpreis" value={eur(r.purchasePrice)} />}
        <Fact label={r.kind === "OBJECT" ? "Kapitalbedarf" : "Ticket"} value={eur(r.capitalNeed)} />
        <Fact label="Rendite-Erw." value={r.targetReturnPct != null ? `${r.targetReturnPct} %` : "—"} />
        <Fact label="Haltedauer" value={r.holdingPeriodYears != null ? `${r.holdingPeriodYears} J.` : "—"} />
      </section>

      {r.description ? (
        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Beschreibung</h2>
          <p className="whitespace-pre-line text-sm text-slate-700">{r.description}</p>
        </section>
      ) : null}

      <section className="mt-6">
        <InterestButton requestId={r.id} isOwner={r.isOwner} myInterest={r.myInterest} />
      </section>

      <p className="mt-8 border-t border-slate-100 pt-4 text-xs text-slate-400">
        Oikos stellt nur den Kontakt her — keine Anlagevermittlung, keine Kapitalabwicklung. Prüfung und
        Abschluss liegen allein bei den Beteiligten.
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
