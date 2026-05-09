"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import { Card, Button, Input, Label } from "@/components/ui";

/**
 * Phase H8 — Manuelle Coin-Korrektur (ADMIN_ADJUSTMENT).
 *
 * Schreibt eine CoinTransaction mit kind=ADMIN_ADJUSTMENT, refId timestamp-basiert
 * (nicht idempotent — bewusst, damit ein Admin mehrfach gleiche Korrekturen
 * schreiben kann). Note wird im Backend mit "[admin:<id>]"-Praefix versehen.
 */
export function AdminAdjustForm() {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setMsg(null);

    const amt = Number(amount);
    if (!Number.isFinite(amt) || !Number.isInteger(amt) || amt === 0) {
      setMsg({ kind: "err", text: "Amount muss ganze Zahl != 0 sein." });
      return;
    }

    setBusy(true);
    try {
      const res = await apiFetch("/admin/coins/adjust", {
        method: "POST",
        body: JSON.stringify({
          userId: userId.trim(),
          amount: amt,
          note: note.trim()
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg({
          kind: "err",
          text: json?.message ?? json?.error ?? `Fehler ${res.status}`
        });
        return;
      }
      setMsg({
        kind: "ok",
        text: `Gebucht. Neuer Saldo: ${json.newBalance} (refId: ${json.refId})`
      });
      setAmount("");
      setNote("");
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Fehler" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Manuelle Korrektur (ADMIN_ADJUSTMENT)">
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-[2fr_1fr_3fr_auto]">
        <div>
          <Label>User-ID</Label>
          <Input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="cuid…"
            required
            minLength={8}
          />
        </div>
        <div>
          <Label>Amount (signed)</Label>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="z. B. 50 oder -25"
            required
            inputMode="numeric"
          />
        </div>
        <div>
          <Label>Note (Audit)</Label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Grund der Korrektur"
            required
            minLength={3}
            maxLength={200}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Sende …" : "Buchen"}
          </Button>
        </div>
      </form>
      {msg ? (
        <div
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            msg.kind === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {msg.text}
        </div>
      ) : null}
      <div className="mt-2 text-[10px] text-zinc-400">
        Bei negativem Amount blockiert das Backend, wenn Saldo darunter unter 0
        rutschen würde.
      </div>
    </Card>
  );
}
