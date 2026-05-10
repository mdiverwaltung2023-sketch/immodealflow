"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import { Card, Select } from "@/components/ui";
import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatusT
} from "@/lib/api";

const STATUSES: ApplicationStatusT[] = [
  "NEW",
  "REVIEWING",
  "VIEWING",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN"
];

export function ApplicationStatusForm({
  applicationId,
  currentStatus
}: {
  applicationId: string;
  currentStatus: ApplicationStatusT;
}) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function update(next: ApplicationStatusT) {
    if (busy || next === currentStatus) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await apiFetch(`/me/rental-applications/${applicationId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next })
      });
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        setErr(j?.error ?? `Fehler ${r.status}`);
        return;
      }
      setMsg(`Status auf "${APPLICATION_STATUS_LABELS[next]}" gesetzt.`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Status ändern">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-zinc-600">Aktueller Status:</span>
        <span className="font-medium text-zinc-900">
          {APPLICATION_STATUS_LABELS[currentStatus]}
        </span>
        <Select
          disabled={busy}
          value={currentStatus}
          onChange={(e) => update(e.target.value as ApplicationStatusT)}
          className="max-w-xs"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {APPLICATION_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
      {err ? <div className="mt-2 text-xs text-rose-600">{err}</div> : null}
      {msg ? <div className="mt-2 text-xs text-emerald-700">{msg}</div> : null}
    </Card>
  );
}
