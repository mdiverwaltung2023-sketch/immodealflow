"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApiFetch } from "@/lib/client-fetch";

/**
 * Coin-Highlight-Button (50 Coins / 7 Tage / gelber Rand).
 * Alternative zum Stripe-Premium-Button (99 EUR / 30 Tage / Top-Pin).
 * Beide koennen parallel laufen.
 *
 * Holt selbst /me/coins, um Balance und aktive Highlights zu kennen.
 */
export function CoinHighlightButton({ listingId }: { listingId: string }) {
  const apiFetch = useApiFetch();
  const router = useRouter();

  const [balance, setBalance] = useState<number | null>(null);
  const [activeUntil, setActiveUntil] = useState<Date | null>(null);
  const [cost, setCost] = useState<number>(50);
  const [days, setDays] = useState<number>(7);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await apiFetch("/me/coins");
        if (!r.ok) return;
        const j = (await r.json()) as {
          balance: number;
          activeSpends: { kind: string; targetId: string | null; validUntil: string }[];
          spendCosts: Record<string, { coins: number; days: number }>;
        };
        if (!live) return;
        setBalance(j.balance);
        const cfg = j.spendCosts.SPEND_LISTING_HIGHLIGHT;
        if (cfg) {
          setCost(cfg.coins);
          setDays(cfg.days);
        }
        const active = j.activeSpends.find(
          (s) =>
            s.kind === "SPEND_LISTING_HIGHLIGHT" &&
            s.targetId === listingId &&
            new Date(s.validUntil).getTime() > Date.now()
        );
        setActiveUntil(active ? new Date(active.validUntil) : null);
      } catch {
        /* leise */
      }
    })();
    return () => {
      live = false;
    };
  }, [apiFetch, listingId]);

  const isActive = activeUntil != null;
  const daysLeft = activeUntil
    ? Math.max(0, Math.ceil((activeUntil.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;
  const canAfford = balance != null && balance >= cost;

  async function spend() {
    if (busy) return;
    if (!canAfford) {
      setErr(`Du brauchst ${cost} Coins (aktuell ${balance ?? "—"}).`);
      return;
    }
    if (
      !confirm(
        `${cost} Coins für ${days} Tage Coin-Highlight ausgeben? Coins sind nicht erstattbar.`
      )
    ) {
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch("/me/coins/spend", {
        method: "POST",
        body: JSON.stringify({ kind: "SPEND_LISTING_HIGHLIGHT", targetId: listingId })
      });
      if (res.status === 402) {
        const j = await res.json().catch(() => null);
        setErr(j?.message ?? "Nicht genug Coins.");
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setErr(j?.error ?? `Fehler ${res.status}`);
        return;
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={
        isActive
          ? "rounded-xl border-2 border-amber-400 bg-amber-50 p-4 shadow-sm"
          : "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            isActive
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow"
              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"
          }
        >
          <span className="text-lg">✨</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900">Coin-Highlight</span>
            {isActive ? (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                Aktiv · {daysLeft} {daysLeft === 1 ? "Tag" : "Tage"}
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            7 Tage gelber Rand auf der Listing-Karte · zusätzliche Sichtbarkeit
            ohne Top-Position.
            <span className="font-semibold"> {cost} Coins.</span>
          </div>
          {isActive && activeUntil ? (
            <div className="mt-1 text-[11px] text-zinc-500">
              Aktuell aktiv bis {activeUntil.toLocaleDateString("de-DE")}. Erneutes Buchen
              addiert weitere {days} Tage.
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={spend}
              disabled={busy || balance == null}
              className={
                isActive
                  ? "rounded-lg border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                  : "rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              }
            >
              {busy
                ? "Sende …"
                : balance == null
                ? "Lade …"
                : isActive
                ? `Verlängern (${cost} Coins)`
                : `Highlight buchen (${cost} Coins)`}
            </button>
            {balance != null ? (
              <span className="text-[11px] text-zinc-500">
                Saldo: {balance} Coins{" "}
                {!canAfford ? (
                  <Link href="/coins" className="text-amber-700 hover:underline">
                    · mehr verdienen
                  </Link>
                ) : null}
              </span>
            ) : null}
            {err ? <span className="text-xs text-rose-600">{err}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
