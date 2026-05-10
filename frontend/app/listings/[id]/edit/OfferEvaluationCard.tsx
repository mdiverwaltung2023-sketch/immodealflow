"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { useApiFetch } from "@/lib/client-fetch";
import { Button, Input, Textarea, Label } from "@/components/ui";
import {
  OfferEvaluationSchema,
  OFFER_ATTRACTIVENESS_LABELS,
  OFFER_RECOMMENDATION_LABELS,
  type OfferEvaluationT,
  type OfferAttractivenessT,
  type OfferRecommendationT
} from "@/lib/api";

const HistorySchema = z.array(OfferEvaluationSchema);

function eur(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

const ATTRACTIVENESS_TONE: Record<OfferAttractivenessT, string> = {
  SEHR_ATTRAKTIV: "bg-emerald-50 text-emerald-800 border-emerald-200",
  MARKTGERECHT: "bg-indigo-50 text-indigo-800 border-indigo-200",
  NIEDRIG: "bg-amber-50 text-amber-900 border-amber-200",
  UNREALISTISCH: "bg-rose-50 text-rose-800 border-rose-200"
};

const RECOMMENDATION_TONE: Record<OfferRecommendationT, string> = {
  AKZEPTIEREN: "bg-emerald-600 text-white",
  GEGENANGEBOT: "bg-amber-500 text-white",
  ABLEHNEN: "bg-rose-600 text-white"
};

export function OfferEvaluationCard({ listingId }: { listingId: string }) {
  const apiFetch = useApiFetch();

  const [history, setHistory] = useState<OfferEvaluationT[]>([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await apiFetch(`/me/listings/${listingId}/offer-evals`);
        if (!r.ok) return;
        const j = await r.json();
        const parsed = HistorySchema.safeParse(j);
        if (live && parsed.success) setHistory(parsed.data);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [apiFetch, listingId]);

  async function evaluate() {
    if (busy) return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setErr("Bitte gültigen Betrag in EUR eingeben.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await apiFetch(`/me/listings/${listingId}/offer-evals`, {
        method: "POST",
        body: JSON.stringify({
          offerAmount: Math.round(n),
          offerNote: note.trim() || null
        })
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) {
        setErr(j?.error ?? `Fehler ${r.status}`);
        return;
      }
      const parsed = OfferEvaluationSchema.safeParse(j);
      if (parsed.success) {
        setHistory((prev) => [parsed.data, ...prev]);
        setAmount("");
        setNote("");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <span className="text-lg">⚖️</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-zinc-900">
            Angebot bewerten lassen
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            Trag den Preisvorschlag eines Käufers ein — Claude bewertet
            Attraktivität, schätzt Erfolgswahrscheinlichkeit und schlägt
            ggf. ein Gegenangebot vor.
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_2fr_auto]">
            <div>
              <Label>Angebot (EUR)</Label>
              <Input
                type="number"
                min={0}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="z. B. 850000"
              />
            </div>
            <div>
              <Label>Notiz / Kontext (optional)</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="z. B. Familie Müller, Finanzierung Sparkasse"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={evaluate} disabled={busy} className="w-full">
                {busy ? "Bewerte …" : "Bewerten"}
              </Button>
            </div>
          </div>
          {err ? <div className="mt-2 text-xs text-rose-600">{err}</div> : null}
        </div>
      </div>

      {/* History */}
      {loading ? (
        <div className="mt-4 text-xs text-zinc-400">Lade Verlauf …</div>
      ) : history.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-500">
          Noch keine Bewertungen. Sobald du oben ein Angebot eingibst, taucht
          es hier auf.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Verlauf ({history.length})
          </div>
          {history.map((ev) => (
            <EvaluationItem key={ev.id} ev={ev} />
          ))}
        </div>
      )}

      <div className="mt-3 border-t border-zinc-100 pt-2 text-[10px] text-zinc-400">
        KI-Einschätzung ohne Echtzeit-Marktdaten. Nicht rechtlich belastbar.
      </div>
    </div>
  );
}

function EvaluationItem({ ev }: { ev: OfferEvaluationT }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm font-semibold text-zinc-900 tabular-nums">
          {eur(ev.offerAmount)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {ev.attractiveness ? (
            <span
              className={`rounded-full border px-2 py-0.5 font-medium ${
                ATTRACTIVENESS_TONE[ev.attractiveness]
              }`}
            >
              {OFFER_ATTRACTIVENESS_LABELS[ev.attractiveness]}
            </span>
          ) : null}
          {ev.recommendation ? (
            <span
              className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wider ${
                RECOMMENDATION_TONE[ev.recommendation]
              }`}
            >
              {OFFER_RECOMMENDATION_LABELS[ev.recommendation]}
            </span>
          ) : null}
          <span className="text-[10px] text-zinc-400">
            {new Date(ev.createdAt).toLocaleDateString("de-DE")}
          </span>
        </div>
      </div>

      {ev.offerNote ? (
        <div className="mt-1 text-xs text-zinc-500 italic">{ev.offerNote}</div>
      ) : null}

      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {ev.successProbability != null ? (
          <div className="rounded-lg border border-zinc-200 p-2 text-xs">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
              Erfolgswahrscheinlichkeit
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${Math.round(ev.successProbability * 100)}%` }}
                />
              </div>
              <span className="text-xs font-semibold tabular-nums text-zinc-900">
                {Math.round(ev.successProbability * 100)} %
              </span>
            </div>
          </div>
        ) : null}
        {ev.counterOffer ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs">
            <div className="text-[10px] uppercase tracking-wider text-amber-800">
              Vorschlag Gegenangebot
            </div>
            <div className="mt-0.5 text-sm font-bold tabular-nums text-amber-900">
              {eur(ev.counterOffer)}
            </div>
          </div>
        ) : null}
      </div>

      {ev.negotiationHints ? (
        <div className="mt-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Verhandlungshinweise
          </div>
          <div className="mt-0.5 text-xs text-zinc-700 whitespace-pre-wrap">
            {ev.negotiationHints}
          </div>
        </div>
      ) : null}

      {ev.strategicAdvice ? (
        <div className="mt-2 rounded-lg bg-zinc-50 p-2 text-xs text-zinc-700 italic">
          {ev.strategicAdvice}
        </div>
      ) : null}
    </div>
  );
}
