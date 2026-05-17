"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import { OffmarketInvestorCard } from "@/components/OffmarketInvestorCard";
import type { OffmarketInvestorMatchT } from "@/lib/api";

export function LeadMatchPanel({
  leadId,
  matches
}: {
  leadId: string;
  matches: OffmarketInvestorMatchT[];
}) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ownerNote, setOwnerNote] = useState<string>("");

  async function invite(userId: string) {
    setInvitingId(userId);
    setError(null);
    try {
      const res = await apiFetch(`/me/offmarket-leads/${leadId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investorIds: [userId],
          ownerNote: ownerNote || null
        })
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      setError((e as Error).message || "Einladen fehlgeschlagen");
    } finally {
      setInvitingId(null);
    }
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
        <div className="text-sm text-zinc-500">
          Aktuell sind keine passenden Investoren-Profile in unserem Pool —
          neue Profile werden hier automatisch angezeigt, sobald sie sich
          registrieren.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Passende Investoren ({matches.length})
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Sortiert nach Match-Score. Sie sehen, wer finanzieren kann — bevor
            Sie sich offenbaren.
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-3">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Persönliche Notiz an alle Eingeladenen (optional)
        </label>
        <textarea
          value={ownerNote}
          onChange={(e) => setOwnerNote(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          placeholder="z.B. 'Verkauf wegen Erbteilung, Notar-Termin in 4 Wochen möglich, vor-Ort-Besichtigung individuell.'"
        />
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {matches.map((m) => (
          <OffmarketInvestorCard
            key={m.userId}
            match={m}
            onInvite={invite}
            inviting={invitingId === m.userId}
          />
        ))}
      </div>
    </div>
  );
}
