"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";

export function InviteResponseForm({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function respond(action: "ACCEPT" | "DECLINE") {
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch(`/me/offmarket-invites/${inviteId}/respond`, {
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
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-900">Antwort senden</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Bei Annahme schalten wir Adresse und Eigentümer-Kontakt frei, und Sie
        können direkt im 1:1-Chat schreiben.
      </p>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        placeholder="Optional: kurze Notiz an den Eigentümer (z.B. Besichtigungswunsch)"
      />

      {err && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => respond("ACCEPT")}
          className="flex-1 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
        >
          ✓ Interesse bestätigen
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => respond("DECLINE")}
          className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-600 disabled:opacity-50"
        >
          Ablehnen
        </button>
      </div>
    </div>
  );
}
