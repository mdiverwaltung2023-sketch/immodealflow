"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { AuctionInfoSchema, AUCTION_TYPE_LABELS, type AuctionInfoT } from "@/lib/api";

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

function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function AuctionPanel({
  id,
  initial
}: {
  id: string;
  initial: AuctionInfoT;
}) {
  const router = useRouter();
  const [auction, setAuction] = useState<AuctionInfoT>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = process.env.NEXT_PUBLIC_API_BASE_URL;

  async function recompute() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`${api?.replace(/\/+$/, "")}/properties/${id}/recompute-bid-limit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Fehlgeschlagen (${res.status}) ${txt}`);
      }
      const data = AuctionInfoSchema.parse(await res.json());
      setAuction(data);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  const days = auction.auctionDate ? daysUntil(auction.auctionDate) : null;
  const isPast = days != null && days < 0;
  const isImminent = days != null && days >= 0 && days <= 14;

  return (
    <div className="space-y-4">
      {/* Termin-Banner */}
      {auction.auctionDate ? (
        <div
          className={`rounded-xl border p-4 ${
            isPast
              ? "border-zinc-800 bg-zinc-950 text-zinc-400"
              : isImminent
                ? "border-rose-900 bg-rose-950/40 text-rose-200"
                : "border-indigo-900 bg-indigo-950/40 text-indigo-200"
          }`}
        >
          <div className="text-xs uppercase tracking-wide opacity-70">Termin</div>
          <div className="mt-1 text-base font-semibold">{formatDate(auction.auctionDate)}</div>
          <div className="text-sm">
            {isPast
              ? "Termin vergangen"
              : days === 0
                ? "Heute!"
                : `in ${days} Tag${days === 1 ? "" : "en"}`}
            {auction.auctionLocation ? ` · ${auction.auctionLocation}` : ""}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-zinc-950 p-4">
          <div className="text-xs text-zinc-400">Verkehrswert (lt. Gutachten)</div>
          <div className="mt-1 text-base font-semibold text-white">
            {auction.marketValue ? eur(auction.marketValue) : "—"}
          </div>
        </div>

        <div className="rounded-xl border bg-emerald-950/40 p-4">
          <div className="text-xs text-emerald-300">Bietlimit (CF n. Steuer ≥ 0)</div>
          <div className="mt-1 text-2xl font-bold text-emerald-300">
            {auction.bidLimit ? eur(auction.bidLimit) : "—"}
          </div>
          <div className="mt-1 text-[11px] text-emerald-400/70">
            Standard-Annahmen · darüber kippt der monatliche Cashflow ins Negative
          </div>
        </div>

        <div className="rounded-xl border bg-zinc-950 p-4">
          <div className="text-xs text-zinc-400">Aktenzeichen</div>
          <div className="mt-1 text-base font-semibold text-white">{auction.caseNumber ?? "—"}</div>
          <div className="mt-2 text-xs text-zinc-400">{AUCTION_TYPE_LABELS[auction.auctionType]}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={recompute} disabled={busy} variant="secondary">
          {busy ? "Berechne…" : "Bietlimit neu berechnen (Standard)"}
        </Button>
        {auction.sourceUrl ? (
          <a
            href={auction.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-zinc-400 underline hover:text-white"
          >
            Quelle öffnen ↗
          </a>
        ) : null}
        {error ? <span className="text-sm text-rose-400">{error}</span> : null}
      </div>

      {auction.notes ? (
        <div className="rounded-xl border bg-zinc-950 p-3">
          <div className="text-xs text-zinc-400">Auffälligkeiten aus der Bekanntmachung</div>
          <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-100">{auction.notes}</div>
        </div>
      ) : null}
    </div>
  );
}
