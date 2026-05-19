"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import {
  SALE_STAGE_LABELS,
  SALE_STAGE_ORDER,
  SALE_DOC_LABELS,
  SALE_DOC_ORDER,
  type SaleStageT
} from "@/lib/api";

/**
 * Phase M1 — Verkaufsabwicklung als Werbemittel.
 *
 * Statt einem Start-Modal mit Kaufpreis-Eingabe zeigt diese Karte
 * dauerhaft, was der Verkaufs-Workflow leistet:
 *   - 13 Pipeline-Stationen als horizontaler Stepper-Preview
 *   - 14 Dokumenten-Slots als Liste
 * Ein einziger Klick startet die Pipeline (ohne Kaufpreis-Pflicht);
 * Kaufpreis und Notizen werden anschliessend in der Verkaufs-Seite
 * gepflegt.
 *
 * Wenn eine Pipeline schon laeuft, wird Status + Direkt-Link gezeigt.
 */

type ActiveProc = {
  id: string;
  currentStage: SaleStageT;
  agreedPrice: number | null;
};

export function StartSaleProcessButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const apiFetch = useApiFetch();

  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState<ActiveProc | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await apiFetch(
          `/me/sale-processes?listingId=${encodeURIComponent(listingId)}`
        );
        if (!res.ok) {
          if (live) setLoaded(true);
          return;
        }
        const json = (await res.json()) as Array<{
          id: string;
          currentStage: SaleStageT;
          agreedPrice: number | null;
        }>;
        if (!live) return;
        const a =
          json.find(
            (p) =>
              p.currentStage !== "ABGESCHLOSSEN" && p.currentStage !== "ABGEBROCHEN"
          ) ?? null;
        setActive(a);
        setLoaded(true);
      } catch {
        if (live) setLoaded(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [apiFetch, listingId]);

  async function start() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      // Kein Modal, kein Preis: direkt mit leerem Body anlegen.
      // agreedPrice + Notizen pflegt der Verkaeufer in /sales/[id].
      const res = await apiFetch(`/me/listings/${listingId}/sale-processes`, {
        method: "POST",
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setErr(j?.error ?? `Fehler ${res.status}`);
        return;
      }
      const proc = (await res.json()) as { id: string };
      router.push(`/sales/${proc.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-xs text-zinc-400">
        Lade Verkaufsstatus …
      </div>
    );
  }

  if (active) {
    return (
      <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow">
            <span className="text-lg">📁</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900">
                Verkaufsabwicklung läuft
              </span>
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                {SALE_STAGE_LABELS[active.currentStage]}
              </span>
            </div>
            <div className="mt-1 text-xs text-zinc-600">
              Stationen, Notizen und Dokumente verwaltest du auf der Verkaufs-Seite.
            </div>
            <div className="mt-3">
              <Link
                href={`/sales/${active.id}`}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Verkauf öffnen →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Werbe-Sicht: zeigt Pipeline + Dokumenten-Slots schon VOR dem Start ---
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
          <span className="text-lg">📁</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-zinc-900">
            Verkaufsabwicklung — geführter Prozess in 13 Stationen
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            Vom akzeptierten Interesse bis zur Eigentumsumschreibung — strukturiert
            mit Audit-Verlauf, 14 Dokumenten-Slots und Freigabe-Links für
            Kaufinteressenten. Starte jederzeit, auch ohne fixen Kaufpreis.
          </div>

          {/* Pipeline-Preview (horizontaler Stepper, read-only) */}
          <div className="mt-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Pipeline-Stationen
            </div>
            <ol className="mt-2 flex flex-wrap gap-1">
              {SALE_STAGE_ORDER.map((stage, idx) => (
                <li key={stage}>
                  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] text-zinc-600">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-300 text-[9px] font-bold text-white">
                      {idx + 1}
                    </span>
                    {SALE_STAGE_LABELS[stage]}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Dokumenten-Slots-Preview */}
          <div className="mt-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Dokumenten-Slots — gezielt freigebbar an Kaufinteressenten
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-zinc-600 md:grid-cols-3">
              {SALE_DOC_ORDER.map((kind) => (
                <li key={kind} className="truncate">• {SALE_DOC_LABELS[kind]}</li>
              ))}
            </ul>
          </div>

          {err ? (
            <div className="mt-3 rounded bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {err}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={start}
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy ? "Starte …" : "Verkaufsabwicklung starten"}
            </button>
            <span className="text-[11px] text-zinc-500">
              kein Kaufpreis nötig — pflegst du später
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
