"use client";

// Phase N — Oikos Capital Layer, Schritt 1: Financing-Readiness-Ampel.
// Laedt die live berechnete Bankfähigkeits-Bewertung des Backends und
// rendert Gesamt-Ampel + Einzelkriterien + Maßnahmen.
//
// Regulatorik: reine Selbsteinschätzung, KEINE Finanzierungsberatung
// (Disclaimer kommt aus dem Backend mit).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { FinancingReadinessSchema, type FinancingReadinessT, type Light } from "@/lib/api";
import { useApiFetch } from "@/lib/client-fetch";

const LIGHT_DOT: Record<Light, string> = {
  GREEN: "bg-emerald-500",
  YELLOW: "bg-amber-400",
  RED: "bg-rose-500"
};

const LIGHT_TEXT: Record<Light, string> = {
  GREEN: "text-emerald-700",
  YELLOW: "text-amber-700",
  RED: "text-rose-700"
};

const LIGHT_BANNER: Record<Light, string> = {
  GREEN: "border-emerald-200 bg-emerald-50",
  YELLOW: "border-amber-200 bg-amber-50",
  RED: "border-rose-200 bg-rose-50"
};

function TrafficLight({ light, size = "md" }: { light: Light; size?: "sm" | "md" }) {
  const dot = size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";
  const lights: Light[] = ["RED", "YELLOW", "GREEN"];
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-1.5 py-1">
      {lights.map((l) => (
        <span
          key={l}
          className={`${dot} rounded-full ${l === light ? LIGHT_DOT[l] : "bg-zinc-200"}`}
        />
      ))}
    </span>
  );
}

export function FinancingReadinessPanel({ id }: { id: string }) {
  const apiFetch = useApiFetch();
  const [data, setData] = useState<FinancingReadinessT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/properties/${id}/financing-readiness`);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Fehlgeschlagen (${res.status}) ${txt}`);
      }
      setData(FinancingReadinessSchema.parse(await res.json()));
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
    return <div className="text-sm text-zinc-500">Bankfähigkeit wird berechnet…</div>;
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
    <div className="space-y-4">
      {/* Gesamt-Ampel */}
      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${LIGHT_BANNER[data.overall]}`}>
        <div className="flex items-center gap-3">
          <TrafficLight light={data.overall} />
          <div>
            <div className={`text-base font-semibold ${LIGHT_TEXT[data.overall]}`}>
              {data.overallLabel}
            </div>
            <div className="text-xs text-zinc-500">
              Financing-Readiness-Score: {data.readinessScore} / 100
            </div>
          </div>
        </div>
        <Button variant="ghost" onClick={() => void load()} disabled={busy}>
          {busy ? "Aktualisiere…" : "Neu berechnen"}
        </Button>
      </div>

      {!data.basis.hasProfile ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800">
          Noch kein Investor-Profil hinterlegt — Eigenkapital, Einkommen und
          Bonität fehlen.{" "}
          <Link href="/profile" className="font-medium underline">
            Profil vervollständigen
          </Link>{" "}
          für eine belastbare Bewertung.
        </div>
      ) : null}

      {/* Einzelkriterien */}
      <div className="overflow-hidden rounded-xl border border-zinc-200">
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-zinc-200">
            {data.criteria.map((c) => (
              <tr key={c.key} className="align-top">
                <td className="w-10 px-3 py-3">
                  <span className={`inline-block h-3 w-3 rounded-full ${LIGHT_DOT[c.light]}`} />
                </td>
                <td className="px-2 py-3">
                  <div className="font-medium text-zinc-900">{c.label}</div>
                  <div className="text-xs text-zinc-500">{c.detail}</div>
                  {c.measure && c.light !== "GREEN" ? (
                    <div className={`mt-1 text-xs ${LIGHT_TEXT[c.light]}`}>→ {c.measure}</div>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-zinc-900">
                  {c.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Maßnahmen */}
      {data.measures.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Nächste Schritte zur Bankfähigkeit
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
            {data.measures.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Alle Kernkriterien erfüllt — dieser Deal ist aus den vorhandenen
          Daten bankfähig.
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-zinc-400">{data.disclaimer}</p>
    </div>
  );
}
