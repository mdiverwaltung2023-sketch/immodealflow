"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";

export function InterestResponseForm({ interestId }: { interestId: string }) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function respond(action: "ACCEPT" | "DECLINE") {
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch(`/me/coinvest-interests/${interestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note || null })
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">Auf dieses Interesse antworten</h2>
      <p className="mt-1 text-sm text-slate-600">
        Bei Annahme öffnen wir den Deal-Room (1:1-Chat) und geben den Namen des Kapitalpartners frei.
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        placeholder="Optional: kurze Notiz an den Kapitalpartner"
      />
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => respond("ACCEPT")}
          className="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
        >
          ✓ Annehmen & Deal-Room öffnen
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => respond("DECLINE")}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Ablehnen
        </button>
      </div>
    </div>
  );
}
