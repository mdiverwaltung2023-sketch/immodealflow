"use client";

// Phase O — speichert die aktuelle Bankfähigkeit als persistenten
// Finanzierungsvorgang (optional mit Wunsch-Darlehensbetrag + Notiz).
// Erscheint danach im Finanzierungs-Cockpit.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { useApiFetch } from "@/lib/client-fetch";

export function CreateFinancingRequestButton({ id }: { id: string }) {
  const apiFetch = useApiFetch();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const cleanedAmount = amount.replace(/[.\s]/g, "").replace(",", ".");
      const amountNum = cleanedAmount ? Math.round(Number(cleanedAmount)) : null;
      if (amountNum != null && !Number.isFinite(amountNum)) {
        throw new Error("Bitte einen gültigen Darlehensbetrag eingeben.");
      }
      const res = await apiFetch(`/properties/${id}/financing-requests`, {
        method: "POST",
        body: JSON.stringify({
          desiredLoanAmount: amountNum,
          note: note.trim() || null
        })
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

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setOpen(true)}>Als Finanzierungsanfrage speichern</Button>
        <span className="text-xs text-zinc-500">
          Hält den aktuellen Stand fest — bleibt im Cockpit erhalten.
        </span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
      <div>
        <Label>Wunsch-Darlehensbetrag (EUR, optional)</Label>
        <Input
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="z. B. 320000"
        />
      </div>
      <div>
        <Label>Notiz (optional)</Label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="z. B. Bankzusage bis Q4 gewünscht, Tilgung 2 %"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={create} disabled={busy}>
          {busy ? "Speichere…" : "Anfrage speichern"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
          Abbrechen
        </Button>
        {error ? <span className="text-sm text-rose-600">{error}</span> : null}
      </div>
    </div>
  );
}
