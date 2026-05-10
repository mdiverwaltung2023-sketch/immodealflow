"use client";

import Link from "next/link";
import { useState } from "react";
import { useApiFetch } from "@/lib/client-fetch";
import { PlanBadge } from "@/components/PlanBadge";
import type { BillingStateT } from "@/lib/api";

/**
 * Abo-Verwaltungs-Karte im Profil. Zeigt aktuellen Plan,
 * Customer-Portal-Button für aktive Abos, Upgrade-Link für Free.
 */
export function BillingCard({ billing }: { billing: BillingStateT }) {
  const apiFetch = useApiFetch();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function openPortal() {
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch("/me/billing/portal", { method: "POST" });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Portal nicht verfügbar (${res.status}) ${txt.slice(0, 200)}`);
      }
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("Keine Portal-URL.");
      window.location.href = data.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Abo & Rechnungen</div>
          <div className="mt-1 flex items-center gap-2">
            <PlanBadge plan={billing.plan} size="md" asLink={false} />
            {billing.planValidUntil ? (
              <span className="text-xs text-zinc-500">
                gültig bis {new Date(billing.planValidUntil).toLocaleDateString("de-DE")}
              </span>
            ) : null}
          </div>
        </div>
        <Link
          href="/pricing"
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          Tarife ansehen →
        </Link>
      </div>

      <div className="mt-4">
        {billing.plan === "FREE" ? (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <div className="text-sm font-semibold text-indigo-900">
              Werde Mitglied im Investor Club
            </div>
            <div className="mt-1 text-xs text-indigo-800/90">
              Off-Market-Deals zuerst sehen, KI-Bietlimit pro Objekt,
              Verifiziert-Badge — 19 €/Monat, monatlich kündbar.
            </div>
            <Link
              href="/pricing"
              className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Mitgliedschaft starten
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={openPortal}
              disabled={busy || !billing.hasSubscription}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              {busy ? "Öffne Portal…" : "Abo verwalten (Stripe)"}
            </button>
            <div className="text-xs text-zinc-500">
              Im Stripe Customer Portal kannst du Plan, Zahlungsmethode und Rechnungen
              selbst verwalten oder kündigen.
            </div>
            {err ? <div className="text-xs text-rose-600">{err}</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}
