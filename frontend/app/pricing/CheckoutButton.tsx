"use client";

import { useState } from "react";
import { useApiFetch } from "@/lib/client-fetch";
import type { UserPlanT } from "@/lib/api";

type Props = {
  plan: Exclude<UserPlanT, "FREE">;
  interval: "monthly" | "yearly";
  label: string;
  variant?: "primary" | "secondary";
  disabledReason?: string | null;
};

/**
 * Startet einen Stripe-Checkout fuer ein Subscription-Price und
 * leitet auf die Stripe-URL weiter.
 *
 * disabledReason: optional — wenn gesetzt, wird der Button als
 * "abgeschlossen / nicht verfügbar" gerendert.
 */
export function CheckoutButton({ plan, interval, label, variant = "primary", disabledReason }: Props) {
  const apiFetch = useApiFetch();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch("/me/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan, interval })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Checkout fehlgeschlagen (${res.status}) ${txt.slice(0, 200)}`);
      }
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("Keine Checkout-URL vom Server.");
      window.location.href = data.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
      setBusy(false);
    }
  }

  if (disabledReason) {
    return (
      <button
        type="button"
        disabled
        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-400"
      >
        {disabledReason}
      </button>
    );
  }

  const cls =
    variant === "primary"
      ? "w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
      : "w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50";

  return (
    <div className="space-y-2">
      <button type="button" onClick={start} disabled={busy} className={cls}>
        {busy ? "Weiterleitung…" : label}
      </button>
      {err ? <div className="text-xs text-rose-600">{err}</div> : null}
    </div>
  );
}
