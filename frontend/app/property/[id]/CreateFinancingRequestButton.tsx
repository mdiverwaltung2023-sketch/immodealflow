"use client";

// Phase O — speichert die aktuelle Bankfähigkeit als persistenten
// Finanzierungsvorgang. Erscheint danach im Finanzierungs-Cockpit.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useApiFetch } from "@/lib/client-fetch";

export function CreateFinancingRequestButton({ id }: { id: string }) {
  const apiFetch = useApiFetch();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/properties/${id}/financing-requests`, {
        method: "POST",
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Fehlgeschlagen (${res.status}) ${txt}`);
      }
      setDone(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-emerald-700">
          ✓ Finanzierungsanfrage gespeichert.
        </span>
        <Link href="/finanzierung" className="font-medium text-emerald-700 underline">
          Im Finanzierungs-Cockpit ansehen →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={create} disabled={busy}>
        {busy ? "Speichere…" : "Als Finanzierungsanfrage speichern"}
      </Button>
      <span className="text-xs text-zinc-500">
        Hält den aktuellen Stand fest — bleibt im Cockpit erhalten.
      </span>
      {error ? <span className="text-sm text-rose-600">{error}</span> : null}
    </div>
  );
}
