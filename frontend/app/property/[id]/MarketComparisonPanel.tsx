"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import {
  MARKET_RATING_LABELS,
  MarketComparisonSchema,
  type MarketComparisonT
} from "@/lib/api";
import { useApiFetch } from "@/lib/client-fetch";

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

const RATING_STYLES: Record<string, string> = {
  below_market: "bg-emerald-50 text-emerald-700 border-emerald-200",
  fair: "bg-zinc-100 text-zinc-700 border-zinc-200",
  above_market: "bg-rose-50 text-rose-700 border-rose-200"
};

export function MarketComparisonPanel({
  id,
  initial,
  property
}: {
  id: string;
  initial: MarketComparisonT | null;
  property: { price: number; rent: number; size: number };
}) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [mc, setMc] = useState<MarketComparisonT | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch(`/properties/${id}/market-comparison`, {
        method: "POST"
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Fehlgeschlagen (${res.status}) ${txt}`);
      }
      const data = MarketComparisonSchema.parse(await res.json());
      setMc(data);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  const ownPricePerSqm = property.size > 0 ? property.price / property.size : 0;
  const ownRentPerSqm = property.size > 0 ? property.rent / property.size : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={refresh} disabled={busy}>
          {busy ? "Schätze…" : mc ? "Marktvergleich neu erstellen" : "Marktvergleich erstellen"}
        </Button>
        {mc ? (
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${RATING_STYLES[mc.rating]}`}>
            {MARKET_RATING_LABELS[mc.rating]}
          </span>
        ) : null}
        {error ? <span className="text-sm text-rose-600">{error}</span> : null}
      </div>

      {mc ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs text-zinc-500">Kaltmiete pro m² (Spanne)</div>
              <div className="mt-1 text-base font-semibold text-zinc-900">
                {mc.rentPerSqmLow.toFixed(2)} – {mc.rentPerSqmHigh.toFixed(2)} €
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                Dieses Objekt: <span className="text-zinc-700">{ownRentPerSqm.toFixed(2)} €/m²</span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs text-zinc-500">Kaufpreis pro m² (Spanne)</div>
              <div className="mt-1 text-base font-semibold text-zinc-900">
                {eur(mc.pricePerSqmLow)} – {eur(mc.pricePerSqmHigh)}
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                Dieses Objekt: <span className="text-zinc-700">{eur(ownPricePerSqm)}/m²</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs text-zinc-500">Bewertung</div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">{mc.rationale}</div>
          </div>

          <div className="text-xs text-zinc-500">
            {mc.dataCaveat} · Stand: {formatDate(mc.updatedAt)}
            {mc.model ? ` · ${mc.model}` : ""}
          </div>
        </div>
      ) : (
        <div className="text-sm text-zinc-500">
          Noch kein Marktvergleich. Claude schätzt typische Spannen für Kaufpreis und Miete pro m² in dieser Lage und vergleicht das Objekt damit.
        </div>
      )}
    </div>
  );
}
