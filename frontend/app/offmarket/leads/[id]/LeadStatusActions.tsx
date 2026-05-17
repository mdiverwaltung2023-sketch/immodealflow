"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import {
  OFFMARKET_LEAD_STATUS_LABELS,
  type OffmarketLeadStatusT
} from "@/lib/api";

export function LeadStatusActions({
  leadId,
  currentStatus
}: {
  leadId: string;
  currentStatus: OffmarketLeadStatusT;
}) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [busy, setBusy] = useState(false);

  async function setStatus(status: OffmarketLeadStatusT) {
    setBusy(true);
    await apiFetch(`/me/offmarket-leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    router.refresh();
    setBusy(false);
  }

  async function del() {
    if (!confirm("Offmarket-Inserat wirklich löschen?")) return;
    setBusy(true);
    await apiFetch(`/me/offmarket-leads/${leadId}`, { method: "DELETE" });
    router.push("/offmarket/leads");
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Link
        href={`/offmarket/leads/${leadId}/edit`}
        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700"
      >
        ✎ Bearbeiten
      </Link>
      <div className="flex flex-col items-end gap-1">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">
          Status
        </div>
        <select
          value={currentStatus}
          disabled={busy}
          onChange={(e) => setStatus(e.target.value as OffmarketLeadStatusT)}
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm"
        >
          {(Object.keys(OFFMARKET_LEAD_STATUS_LABELS) as OffmarketLeadStatusT[]).map((s) => (
            <option key={s} value={s}>
              {OFFMARKET_LEAD_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={del}
        disabled={busy}
        className="text-[11px] text-red-600 hover:underline"
      >
        Inserat löschen
      </button>
    </div>
  );
}
