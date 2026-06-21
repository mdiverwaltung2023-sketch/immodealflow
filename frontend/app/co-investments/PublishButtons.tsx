"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import type { CoInvestStatusT } from "@/lib/api";

const btn =
  "rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50";

export function PublishButtons({ id, status }: { id: string; status: CoInvestStatusT }) {
  const apiFetch = useApiFetch();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(newStatus: CoInvestStatusT) {
    setBusy(true);
    try {
      const res = await apiFetch(`/me/coinvest-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Gesuch wirklich löschen?")) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/me/coinvest-requests/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status === "DRAFT" && (
        <button disabled={busy} onClick={() => patch("ACTIVE")}
          className={`${btn} bg-teal-600 text-white hover:bg-teal-700`}>
          Veröffentlichen
        </button>
      )}
      {status === "ACTIVE" && (
        <button disabled={busy} onClick={() => patch("ARCHIVED")}
          className={`${btn} border border-slate-300 text-slate-600 hover:bg-slate-50`}>
          Zurückziehen
        </button>
      )}
      {status === "ARCHIVED" && (
        <button disabled={busy} onClick={() => patch("ACTIVE")}
          className={`${btn} border border-slate-300 text-slate-600 hover:bg-slate-50`}>
          Erneut aktivieren
        </button>
      )}
      <button disabled={busy} onClick={remove}
        className={`${btn} text-red-600 hover:bg-red-50`}>
        Löschen
      </button>
    </div>
  );
}
