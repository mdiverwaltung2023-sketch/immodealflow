"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import { Button, Input, Textarea, Label } from "@/components/ui";
import { SALE_STAGE_LABELS, type SaleStageT } from "@/lib/api";

/**
 * Phase J4 — Off-Market-Verkauf direkt vom Inserat aus starten.
 *
 * Holt /me/sale-processes?listingId=... beim Mount.
 * - Existiert ein aktiver Prozess (nicht ABGESCHLOSSEN/ABGEBROCHEN):
 *   zeigt Status + Direkt-Link.
 * - Sonst: Button "Off-Market-Verkauf starten" oeffnet Modal mit
 *   optionalem Kaufpreis + Notizen.
 *
 * buyerId wird in V1 leer gelassen — Marco kann den Kaeufer-Namen
 * in die Notiz schreiben. Sobald V2 ein Buyer-Lookup-Feature hat,
 * koennen wir das via PATCH nachtragen.
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

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

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
      const body: Record<string, unknown> = {};
      if (notes.trim()) body.notes = notes.trim();
      if (price.trim()) {
        const p = Number(price);
        if (!Number.isFinite(p) || p < 0) {
          setErr("Preis muss eine positive Zahl sein.");
          setBusy(false);
          return;
        }
        body.agreedPrice = Math.round(p);
      }
      const res = await apiFetch(`/me/listings/${listingId}/sale-processes`, {
        method: "POST",
        body: JSON.stringify(body)
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

  return (
    <>
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
            <span className="text-lg">📁</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-zinc-900">
              Verkaufsabwicklung
            </div>
            <div className="mt-1 text-xs text-zinc-600">
              Off-Market-Verkauf? Starte hier eine Pipeline mit Stationen
              (Besichtigung → Notar → Übergabe), Notizen und Dokumenten-Upload —
              ohne dass jemand über den Marketplace anfragen muss.
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                Off-Market-Verkauf starten
              </button>
            </div>
          </div>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-semibold text-zinc-900">
              Off-Market-Verkauf starten
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Beide Felder sind optional. Du kannst sie später anpassen.
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <Label>Vereinbarter Kaufpreis (EUR, optional)</Label>
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="z. B. 850000"
                />
              </div>
              <div>
                <Label>Notiz (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="z. B. Käufer Familie Müller, Finanzierung Sparkasse, Bonität geprüft"
                />
              </div>
            </div>

            {err ? (
              <div className="mt-3 rounded bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {err}
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                Abbrechen
              </Button>
              <Button onClick={start} disabled={busy}>
                {busy ? "Starte …" : "Verkauf starten"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
