"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApiFetch } from "@/lib/client-fetch";
import { COINVEST_INTEREST_STATUS_LABELS, type CoInvestInterestStatusT } from "@/lib/api";

export function InterestButton({
  requestId,
  isOwner,
  myInterest
}: {
  requestId: string;
  isOwner: boolean;
  myInterest: { id: string; status: CoInvestInterestStatusT } | null;
}) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (isOwner) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Das ist dein eigenes Gesuch. Eingegangene Interessen findest du unter{" "}
        <Link href="/co-investments/interests" className="font-medium text-teal-700 underline">Anfragen & Deal-Rooms</Link>.
      </div>
    );
  }

  if (myInterest) {
    return (
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
        <p className="text-sm text-teal-800">
          Du hast bereits Interesse bekundet — Status:{" "}
          <span className="font-semibold">{COINVEST_INTEREST_STATUS_LABELS[myInterest.status]}</span>.
        </p>
        <Link href={`/co-investments/deal/${myInterest.id}`}
          className="mt-2 inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
          Zum Deal-Room →
        </Link>
      </div>
    );
  }

  async function express() {
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch(`/coinvest/marketplace/${requestId}/interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note || null })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      router.push(`/co-investments/deal/${data.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Interesse bekunden</h2>
      <p className="mt-1 text-sm text-slate-600">
        Stell dich dem Gesuchsteller kurz vor. Erst nach Annahme werden Kontaktdaten frei und der
        Deal-Room (1:1-Chat) geöffnet.
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        placeholder="Optional: kurze Vorstellung (Ticketgröße, Erfahrung, was du einbringst …)"
      />
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={express}
        className="mt-3 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
      >
        {busy ? "Senden …" : "Interesse senden"}
      </button>
    </div>
  );
}
