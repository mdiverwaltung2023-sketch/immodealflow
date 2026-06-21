"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ASSET_TYPE_LABELS,
  INVEST_STRATEGY_LABELS,
  COINVEST_KIND_LABELS,
  type CoInvestMarketItemT
} from "@/lib/api";
import { CoInvestVisual } from "./CoInvestVisual";

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

type Tab = "ALL" | "OBJECT" | "GENERAL";

export function MarketplaceExplorer({ items }: { items: CoInvestMarketItemT[] }) {
  const [tab, setTab] = useState<Tab>("ALL");

  const counts = useMemo(() => {
    const obj = items.filter((i) => i.kind === "OBJECT").length;
    return { ALL: items.length, OBJECT: obj, GENERAL: items.length - obj };
  }, [items]);

  const shown = useMemo(() => {
    if (tab === "ALL") return items;
    return items.filter((i) => i.kind === tab);
  }, [items, tab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "ALL", label: `Alle (${counts.ALL})` },
    { id: "OBJECT", label: `Konkrete Objekte (${counts.OBJECT})` },
    { id: "GENERAL", label: `Allgemeine Gesuche (${counts.GENERAL})` }
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? "bg-teal-600 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Noch keine {tab === "OBJECT" ? "konkreten Objekte" : tab === "GENERAL" ? "allgemeinen Gesuche" : "veröffentlichten Gesuche"}.
        </p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r) => (
            <li key={r.id}>
            <Link
              href={`/co-investments/marketplace/${r.id}`}
              className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="relative">
                <CoInvestVisual imageUrl={r.imageUrl} assetType={r.assetType} title={r.title} />
                <span
                  className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${
                    r.kind === "OBJECT" ? "bg-white/95 text-teal-700" : "bg-teal-600/95 text-white"
                  }`}
                >
                  {COINVEST_KIND_LABELS[r.kind]}
                </span>
              </div>

              <div className="p-4">
                <h3 className="line-clamp-2 font-semibold text-slate-900">{r.title}</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  {assetLabel(r.assetType)}
                  {r.location ? ` · ${r.location}` : ""}
                </p>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {r.kind === "OBJECT" && (
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-slate-400">Kaufpreis</dt>
                      <dd className="font-medium text-slate-800">{eur(r.purchasePrice)}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-slate-400">
                      {r.kind === "OBJECT" ? "Kapitalbedarf" : "Ticket"}
                    </dt>
                    <dd className="font-semibold text-teal-700">{eur(r.capitalNeed)}</dd>
                  </div>
                  {r.targetReturnPct != null && (
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-slate-400">Rendite-Erw.</dt>
                      <dd className="font-medium text-slate-800">{r.targetReturnPct} %</dd>
                    </div>
                  )}
                  {r.holdingPeriodYears != null && (
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-slate-400">Haltedauer</dt>
                      <dd className="font-medium text-slate-800">{r.holdingPeriodYears} J.</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  {r.strategy ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                      {INVEST_STRATEGY_LABELS[r.strategy]}
                    </span>
                  ) : <span />}
                  <span className="text-xs text-slate-400">{ownerLabel(r.owner)}</span>
                </div>
              </div>
            </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
