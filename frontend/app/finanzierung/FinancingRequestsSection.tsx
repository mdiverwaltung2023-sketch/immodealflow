"use client";

// Phase O — Liste der gespeicherten Finanzierungsanfragen im Cockpit.
// Status ändern (PATCH) + löschen (DELETE). Bleibt nach Reload erhalten.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FINANCING_REQUEST_STATUS_LABELS,
  FINANCING_REQUEST_STATUS_ORDER,
  type FinancingRequestT,
  type FinancingRequestStatusT,
  type Light
} from "@/lib/api";
import { useApiFetch } from "@/lib/client-fetch";

const DOT: Record<Light, string> = {
  GREEN: "bg-emerald-500",
  YELLOW: "bg-amber-400",
  RED: "bg-rose-500"
};

const STATUS_PILL: Record<FinancingRequestStatusT, string> = {
  OFFEN: "bg-zinc-100 text-zinc-700",
  IN_VORBEREITUNG: "bg-blue-50 text-blue-700",
  BEREIT: "bg-emerald-50 text-emerald-700",
  AN_PARTNER: "bg-indigo-50 text-indigo-700",
  ZUGESAGT: "bg-emerald-100 text-emerald-800",
  ABGELEHNT: "bg-rose-50 text-rose-700"
};

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  } catch {
    return iso;
  }
}

export function FinancingRequestsSection({ initial }: { initial: FinancingRequestT[] }) {
  const apiFetch = useApiFetch();
  const router = useRouter();
  const [items, setItems] = useState<FinancingRequestT[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(id: string, status: FinancingRequestStatusT) {
    setBusyId(id);
    setError(null);
    try {
      const res = await apiFetch(`/me/financing-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error(`Fehlgeschlagen (${res.status})`);
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Diese Finanzierungsanfrage wirklich löschen?")) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await apiFetch(`/me/financing-requests/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`Fehlgeschlagen (${res.status})`);
      setItems((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
        Noch keine gespeicherten Finanzierungsanfragen. Öffne ein Objekt und
        klicke dort auf „Als Finanzierungsanfrage speichern".
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
        <div className="text-sm font-semibold text-zinc-900">
          Meine Finanzierungsanfragen ({items.length})
        </div>
        {error ? <span className="text-xs text-rose-600">{error}</span> : null}
      </div>
      <ul className="divide-y divide-zinc-100">
        {items.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {r.overall ? (
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${DOT[r.overall]}`} />
                ) : null}
                {r.property ? (
                  <Link
                    href={`/property/${r.property.id}`}
                    className="truncate text-sm font-medium text-zinc-900 hover:text-emerald-700 hover:underline"
                  >
                    {r.property.title}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-zinc-900">Objekt</span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                {r.property ? `${r.property.location} • ${eur(r.property.price)} • ` : ""}
                {r.readinessScore != null ? `Score ${r.readinessScore}/100 • ` : ""}
                angelegt {formatDate(r.createdAt)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_PILL[r.status]}`}
              >
                {FINANCING_REQUEST_STATUS_LABELS[r.status]}
              </span>
              <select
                value={r.status}
                disabled={busyId === r.id}
                onChange={(e) => changeStatus(r.id, e.target.value as FinancingRequestStatusT)}
                className="h-8 rounded-lg border border-zinc-300 bg-white px-2 text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {FINANCING_REQUEST_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {FINANCING_REQUEST_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <button
                onClick={() => remove(r.id)}
                disabled={busyId === r.id}
                className="text-zinc-400 hover:text-rose-600"
                title="Anfrage löschen"
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
