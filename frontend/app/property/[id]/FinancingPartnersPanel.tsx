"use client";

// Phase P — neutrale, kriterienbasierte Partner-Vorauswahl zu einem Objekt.
// Tippgeber: keine Empfehlung, keine Vermittlung (Disclaimer aus dem Backend).

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import {
  PartnerMatchSchema,
  FINANCING_PARTNER_TYPE_LABELS,
  type PartnerMatchT
} from "@/lib/api";
import { useApiFetch } from "@/lib/client-fetch";

function eur(n: number | null) {
  if (n == null) return "–";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

export function FinancingPartnersPanel({ id }: { id: string }) {
  const apiFetch = useApiFetch();
  const [data, setData] = useState<PartnerMatchT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/properties/${id}/financing-partners`);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Fehlgeschlagen (${res.status}) ${txt}`);
      }
      setData(PartnerMatchSchema.parse(await res.json()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }, [apiFetch, id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (busy && !data) {
    return <div className="text-sm text-zinc-500">Passende Partner werden ermittelt…</div>;
  }
  if (error) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-rose-600">{error}</div>
        <Button variant="secondary" onClick={() => void load()}>
          Erneut versuchen
        </Button>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-3">
      <div className="text-sm text-zinc-600">
        <span className="font-semibold text-zinc-900">{data.matchedCount}</span> von {data.total}{" "}
        Partnern passen zu diesem Deal (Darlehensbedarf {eur(data.basis.loan)}, Beleihung{" "}
        {(data.basis.ltv * 100).toFixed(0)} %).
      </div>

      {data.partners.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
          Aktuell kein passender Partner im Verzeichnis. (Partner werden zentral gepflegt — im
          Admin-Bereich „Finanzierungspartner" anlegen oder Demo-Partner laden.)
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200">
          {data.partners.map((pp) => (
            <li key={pp.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-zinc-900">{pp.name}</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  {FINANCING_PARTNER_TYPE_LABELS[pp.type]}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                {pp.regions.length > 0 ? `Region: ${pp.regions.join(", ")}` : "bundesweit"}
                {pp.maxLtv != null ? ` · max. Beleihung ${(pp.maxLtv * 100).toFixed(0)} %` : ""}
                {` · Volumen ${eur(pp.minVolume)}–${eur(pp.maxVolume)}`}
              </div>
              {pp.note ? <div className="mt-0.5 text-xs text-zinc-500">{pp.note}</div> : null}
              {pp.website ? (
                <div className="mt-0.5 text-xs text-emerald-700">{pp.website}</div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] leading-relaxed text-zinc-400">{data.disclaimer}</p>
    </div>
  );
}
