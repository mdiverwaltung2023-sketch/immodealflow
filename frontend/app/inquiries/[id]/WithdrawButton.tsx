"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";

export function WithdrawButton({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    if (!confirm("Anfrage wirklich zurückziehen?")) return;
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch(`/me/inquiries/${inquiryId}`, { method: "DELETE" });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Fehlgeschlagen (${res.status}) ${txt.slice(0, 200)}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={withdraw}
        disabled={busy}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-700 hover:border-rose-500 hover:text-rose-700 disabled:opacity-50"
      >
        {busy ? "Ziehe zurück…" : "Anfrage zurückziehen"}
      </button>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}
