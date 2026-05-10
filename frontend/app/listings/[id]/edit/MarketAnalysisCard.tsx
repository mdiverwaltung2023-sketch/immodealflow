"use client";

import { useEffect, useState } from "react";
import { useApiFetch } from "@/lib/client-fetch";
import {
  MarketAnalysisSchema,
  SALE_SPEED_LABELS,
  DEMAND_LEVEL_LABELS,
  type MarketAnalysisT
} from "@/lib/api";

/**
 * KI-Marktanalyse-Card auf der Listing-Edit-Page (Phase K4 — TEIL 1).
 * Holt beim Mount die letzte Analyse (cached). Button laesst Claude
 * eine neue erzeugen. Disclaimer prominent unten — die KI hat KEINE
 * Echtzeit-Marktdaten.
 */
function eur(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

export function MarketAnalysisCard({ listingId }: { listingId: string }) {
  const apiFetch = useApiFetch();
  const [analysis, setAnalysis] = useState<MarketAnalysisT | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await apiFetch(`/me/listings/${listingId}/market-analysis`);
        if (r.status === 404) {
          if (live) setAnalysis(null);
          return;
        }
        if (!r.ok) return;
        const j = await r.json();
        const parsed = MarketAnalysisSchema.safeParse(j);
        if (live && parsed.success) setAnalysis(parsed.data);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [apiFetch, listingId]);

  async function generate(force = false) {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await apiFetch(
        `/me/listings/${listingId}/market-analysis${force ? "?force=true" : ""}`,
        { method: "POST" }
      );
      const j = await r.json().catch(() => null);
      if (!r.ok) {
        setErr(j?.error ?? `Fehler ${r.status}`);
        return;
      }
      const parsed = MarketAnalysisSchema.safeParse(j);
      if (parsed.success) setAnalysis(parsed.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
          <span className="text-lg">🤖</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900">
              KI-Preiseinschätzung
            </span>
            {analysis ? (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700 border border-violet-200">
                Vorhanden
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            Claude generiert eine datenbasierte Einschätzung anhand deiner
            Inserat-Daten — Marktpreis-Spanne, Verkaufsgeschwindigkeit,
            Zielgruppen, Strategie, Risiken.
          </div>

          {loading ? (
            <div className="mt-3 text-xs text-zinc-400">Lade …</div>
          ) : !analysis ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => generate(false)}
                disabled={busy}
                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {busy ? "Analyse läuft …" : "KI-Analyse erstellen"}
              </button>
              {err ? <span className="text-xs text-rose-600">{err}</span> : null}
            </div>
          ) : (
            <AnalysisResult
              a={analysis}
              onRegenerate={() => generate(true)}
              busy={busy}
              err={err}
            />
          )}
        </div>
      </div>

      <DisclaimerNote />
    </div>
  );
}

function AnalysisResult({
  a,
  onRegenerate,
  busy,
  err
}: {
  a: MarketAnalysisT;
  onRegenerate: () => void;
  busy: boolean;
  err: string | null;
}) {
  return (
    <div className="mt-4 space-y-4">
      {/* Preisspanne */}
      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Marktpreis-Spanne
        </div>
        <div className="grid grid-cols-3 gap-2">
          <PricePill label="Konservativ" value={eur(a.priceConservative)} tone="zinc" />
          <PricePill label="Marktgerecht" value={eur(a.priceFair)} tone="emerald" highlight />
          <PricePill label="Premium" value={eur(a.pricePremium)} tone="indigo" />
        </div>
        {a.recommendedAskingPrice ? (
          <div className="mt-2 text-xs text-zinc-600">
            <span className="font-semibold text-zinc-900">
              Empfohlener Angebotspreis:
            </span>{" "}
            {eur(a.recommendedAskingPrice)}
            {a.negotiationRange ? (
              <span className="text-zinc-500"> · {a.negotiationRange}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Speed + Demand */}
      <div className="grid grid-cols-2 gap-2">
        <Mini label="Verkaufsgeschwindigkeit" value={a.salesSpeed ? SALE_SPEED_LABELS[a.salesSpeed] : "—"} />
        <Mini label="Nachfrage" value={a.demand ? DEMAND_LEVEL_LABELS[a.demand] : "—"} />
      </div>

      {/* Zielgruppen */}
      {a.buyerSegments.length > 0 ? (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Käufer-Zielgruppen
          </div>
          <div className="flex flex-wrap gap-1.5">
            {a.buyerSegments.map((seg) => (
              <span
                key={seg}
                className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-800"
              >
                {seg}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Strategie */}
      {a.marketingStrategy ? (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Vermarktungsstrategie
          </div>
          <div className="text-xs text-zinc-700 whitespace-pre-wrap">
            {a.marketingStrategy}
          </div>
        </div>
      ) : null}

      {/* Risiken */}
      {a.risks.length > 0 ? (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Risiken
          </div>
          <ul className="space-y-1 text-xs text-zinc-700">
            {a.risks.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-rose-500" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Zusammenfassung */}
      {a.summary ? (
        <div className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 italic">
          {a.summary}
        </div>
      ) : null}

      {/* Aktionen */}
      <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-3">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={busy}
          className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-50"
        >
          {busy ? "Analyse läuft …" : "Neu generieren"}
        </button>
        <span className="text-[10px] text-zinc-400">
          Erstellt {new Date(a.updatedAt).toLocaleString("de-DE")}
          {a.model ? ` · ${a.model}` : ""}
        </span>
        {err ? <span className="text-xs text-rose-600">{err}</span> : null}
      </div>
    </div>
  );
}

function PricePill({
  label,
  value,
  tone,
  highlight = false
}: {
  label: string;
  value: string;
  tone: "zinc" | "emerald" | "indigo";
  highlight?: boolean;
}) {
  const tones = {
    zinc: "border-zinc-200 bg-white text-zinc-800",
    emerald: "border-emerald-300 bg-emerald-50 text-emerald-900",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-900"
  } as const;
  return (
    <div
      className={`rounded-lg border p-2 ${tones[tone]} ${
        highlight ? "ring-2 ring-emerald-200" : ""
      }`}
    >
      <div className="text-[9px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-0.5 text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-2">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

function DisclaimerNote() {
  return (
    <div className="mt-3 border-t border-zinc-100 pt-2 text-[10px] text-zinc-400">
      Datenbasierte KI-Einschätzung auf Basis allgemeiner Marktkenntnis (kein
      Echtzeit-Datenfeed, kein Wertgutachten). Nicht als rechtlich belastbare
      Bewertung verwenden.
    </div>
  );
}
