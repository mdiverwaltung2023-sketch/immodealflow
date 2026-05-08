"use client";

import { useState } from "react";
import { useApiFetch } from "@/lib/client-fetch";

/**
 * Premium-Listing-Checkout-Button (one-off Stripe-Payment, 99 EUR / 30 Tage).
 *
 * Zustände:
 *  - Bereits aktiv (featuredUntil > now): Anzeige der Restdauer +
 *    Möglichkeit, um weitere 30 Tage zu verlängern.
 *  - Nicht aktiv: Premium starten.
 */
export function FeatureCheckoutButton({
  listingId,
  featuredUntil
}: {
  listingId: string;
  featuredUntil: string | null | undefined;
}) {
  const apiFetch = useApiFetch();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isActive =
    featuredUntil != null && new Date(featuredUntil).getTime() > Date.now();
  const daysLeft = featuredUntil
    ? Math.max(
        0,
        Math.ceil(
          (new Date(featuredUntil).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        )
      )
    : 0;

  async function start() {
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch(`/me/listings/${listingId}/checkout-feature`, {
        method: "POST"
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Checkout fehlgeschlagen (${res.status}) ${txt.slice(0, 200)}`);
      }
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("Keine Checkout-URL.");
      window.location.href = data.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
      setBusy(false);
    }
  }

  return (
    <div
      className={
        isActive
          ? "rounded-xl border-2 border-indigo-500 bg-gradient-to-br from-indigo-50 to-violet-50 p-4 shadow-sm"
          : "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            isActive
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow"
              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"
          }
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900">
              Premium-Listing
            </span>
            {isActive ? (
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                Aktiv · {daysLeft} {daysLeft === 1 ? "Tag" : "Tage"}
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            30 Tage Top-Position im Marketplace · Premium-Pill in Karte und Detail ·
            <span className="font-semibold"> 99 € einmalig</span>.
          </div>
          {isActive && featuredUntil ? (
            <div className="mt-1 text-[11px] text-zinc-500">
              Aktuell aktiv bis{" "}
              {new Date(featuredUntil).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
              })}
              . Verlängerung addiert weitere 30 Tage on top.
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={start}
              disabled={busy}
              className={
                isActive
                  ? "rounded-lg border border-indigo-300 bg-white px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                  : "rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              }
            >
              {busy
                ? "Weiterleitung…"
                : isActive
                ? "Um 30 Tage verlängern"
                : "Premium starten (99 €)"}
            </button>
            {err ? <span className="text-xs text-rose-600">{err}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
