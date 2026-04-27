"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { DealStatusEnum, STATUS_LABELS, STATUS_ORDER, type DealStatus } from "@/lib/api";

const Schema = z.object({
  title: z.string().min(1),
  price: z.number().int().positive(),
  rent: z.number().int().nonnegative(),
  location: z.string().min(1),
  size: z.number().positive(),
  status: DealStatusEnum
});

function toNumber(v: string) {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export function EditForm({
  id,
  initial
}: {
  id: string;
  initial: {
    title: string;
    price: string;
    rent: string;
    location: string;
    size: string;
    status: DealStatus;
  };
}) {
  const router = useRouter();
  const api = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => {
    return Schema.safeParse({
      title: form.title,
      price: toNumber(form.price),
      rent: toNumber(form.rent),
      location: form.location,
      size: toNumber(form.size),
      status: form.status
    });
  }, [form]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!api) {
      setError("NEXT_PUBLIC_API_BASE_URL fehlt");
      return;
    }
    if (!parsed.success) {
      setError("Bitte prüfe deine Eingaben.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${api.replace(/\/+$/, "")}/properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Speichern fehlgeschlagen (${res.status}) ${txt}`);
      }
      router.push(`/property/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Titel</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>
        <div>
          <Label>Lage</Label>
          <Input
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          />
        </div>
        <div>
          <Label>Preis (EUR)</Label>
          <Input
            inputMode="numeric"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
        </div>
        <div>
          <Label>Miete (EUR/Monat)</Label>
          <Input
            inputMode="numeric"
            value={form.rent}
            onChange={(e) => setForm((f) => ({ ...f, rent: e.target.value }))}
          />
        </div>
        <div>
          <Label>Größe (m²)</Label>
          <Input
            inputMode="decimal"
            value={form.size}
            onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as DealStatus }))}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error ? <div className="text-sm text-rose-400">{error}</div> : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={busy || !parsed.success}>
          {busy ? "Speichere…" : "Speichern"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => history.back()} disabled={busy}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
