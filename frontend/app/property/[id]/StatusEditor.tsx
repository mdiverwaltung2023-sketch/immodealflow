"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, StatusBadge } from "@/components/ui";
import { STATUS_LABELS, STATUS_ORDER, type DealStatus } from "@/lib/api";

export function StatusEditor({ id, initialStatus }: { id: string; initialStatus: DealStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState<DealStatus>(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = process.env.NEXT_PUBLIC_API_BASE_URL;

  async function changeTo(next: DealStatus) {
    if (next === status || busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`${api?.replace(/\/+$/, "")}/properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next })
      });
      if (!res.ok) throw new Error(`PATCH fehlgeschlagen (${res.status})`);
      setStatus(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-400">Aktuell:</span>
        <StatusBadge status={status} />
      </div>
      <div className="flex flex-wrap gap-2">
        {STATUS_ORDER.map((s) => (
          <Button
            key={s}
            variant={s === status ? "primary" : "secondary"}
            disabled={busy}
            onClick={() => changeTo(s)}
            className="text-xs"
          >
            {STATUS_LABELS[s]}
          </Button>
        ))}
      </div>
      {error ? <div className="text-sm text-rose-400">{error}</div> : null}
    </div>
  );
}
