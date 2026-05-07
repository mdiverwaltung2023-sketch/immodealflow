"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";

export function ClaimLegacyBanner({ count }: { count: number }) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (count <= 0) return null;

  async function claim() {
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch("/me/claim-legacy", { method: "POST" });
      if (!res.ok) throw new Error(`Claim fehlgeschlagen (${res.status})`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="font-semibold">
        {count} bestehende Properties ohne Owner gefunden
      </div>
      <div className="mt-1 text-xs text-amber-800/90">
        Diese Properties wurden vor der Auth-Einführung angelegt. Klick zum Übernehmen — danach erscheinen sie in deinem Dashboard.
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={claim}
          disabled={busy}
          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {busy ? "Übernehme…" : "Jetzt übernehmen"}
        </button>
        {error ? <span className="text-xs text-rose-600">{error}</span> : null}
      </div>
    </div>
  );
}
