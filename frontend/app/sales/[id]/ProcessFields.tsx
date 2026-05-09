"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import { Button, Input, Textarea, Label } from "@/components/ui";

/**
 * Edit-Form für agreedPrice, targetClosingDate und freie Notizen.
 * Speichert via PATCH /me/sale-processes/:id (gesamter Block in einem Request).
 */
export function ProcessFields({
  processId,
  notes,
  agreedPrice,
  targetClosingDate,
  listingPrice
}: {
  processId: string;
  notes: string | null;
  agreedPrice: number | null;
  targetClosingDate: string | null;
  listingPrice: number;
}) {
  const router = useRouter();
  const apiFetch = useApiFetch();

  const [n, setN] = useState(notes ?? "");
  const [price, setPrice] = useState(agreedPrice != null ? String(agreedPrice) : "");
  const [date, setDate] = useState(
    targetClosingDate ? targetClosingDate.slice(0, 10) : ""
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = { notes: n.trim() || null };
      if (price.trim() === "") {
        body.agreedPrice = null;
      } else {
        const p = Number(price);
        if (!Number.isFinite(p) || p < 0) {
          setMsg({ kind: "err", text: "agreedPrice muss eine positive Zahl sein." });
          setBusy(false);
          return;
        }
        body.agreedPrice = Math.round(p);
      }
      body.targetClosingDate = date.trim() ? new Date(date).toISOString() : null;

      const res = await apiFetch(`/me/sale-processes/${processId}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setMsg({ kind: "err", text: j?.error ?? `Fehler ${res.status}` });
        return;
      }
      setMsg({ kind: "ok", text: "Gespeichert." });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Fehler" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Vereinbarter Kaufpreis (EUR)</Label>
          <Input
            type="number"
            min={0}
            step={1000}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={`Listing-Preis: ${listingPrice}`}
          />
          <div className="mt-1 text-[10px] text-zinc-400">
            Kann vom inserierten Preis abweichen (Verhandlungsergebnis).
          </div>
        </div>
        <div>
          <Label>Zieltermin Beurkundung</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="mt-1 text-[10px] text-zinc-400">
            Optional. Wird nur intern angezeigt.
          </div>
        </div>
      </div>

      <div>
        <Label>Notizen</Label>
        <Textarea
          value={n}
          onChange={(e) => setN(e.target.value)}
          placeholder="Freier Text — z. B. Besonderheiten, To-dos für Notar, Status der Finanzierung des Käufers"
          className="min-h-[110px]"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={busy}>
          {busy ? "Speichere …" : "Speichern"}
        </Button>
        {msg ? (
          <span
            className={`text-xs ${msg.kind === "ok" ? "text-emerald-700" : "text-rose-600"}`}
          >
            {msg.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}
