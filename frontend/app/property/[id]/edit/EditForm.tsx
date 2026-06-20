"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button, Input, Label, Select } from "@/components/ui";
import {
  DealStatusEnum,
  STATUS_LABELS,
  STATUS_ORDER,
  BUILDING_CONDITION_LABELS,
  ENERGY_CLASS_LABELS,
  ASSET_TYPE_LABELS,
  type DealStatus
} from "@/lib/api";
import { useApiFetch } from "@/lib/client-fetch";

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
function intOrNull(v: string): number | null {
  const n = toNumber(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

type EditInitial = {
  title: string;
  price: string;
  rent: string;
  location: string;
  size: string;
  status: DealStatus;
  yearBuilt: string;
  units: string;
  condition: string;
  energyClass: string;
  assetType: string;
};

export function EditForm({ id, initial }: { id: string; initial: EditInitial }) {
  const router = useRouter();
  const apiFetch = useApiFetch();

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
    if (!parsed.success) {
      setError("Bitte prüfe deine Eingaben.");
      return;
    }
    setBusy(true);
    try {
      const body = {
        ...parsed.data,
        yearBuilt: intOrNull(form.yearBuilt),
        units: intOrNull(form.units),
        condition: form.condition ? form.condition : null,
        energyClass: form.energyClass ? form.energyClass : null,
        assetType: form.assetType ? form.assetType : null
      };
      const res = await apiFetch(`/properties/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body)
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
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </div>
        <div>
          <Label>Lage</Label>
          <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
        </div>
        <div>
          <Label>Preis (EUR)</Label>
          <Input inputMode="numeric" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
        </div>
        <div>
          <Label>Miete (EUR/Monat)</Label>
          <Input inputMode="numeric" value={form.rent} onChange={(e) => setForm((f) => ({ ...f, rent: e.target.value }))} />
        </div>
        <div>
          <Label>Größe (m²)</Label>
          <Input inputMode="decimal" value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as DealStatus }))}>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Objektdetails (für Finanzierungsmappe)
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Objektart</Label>
            <Select value={form.assetType} onChange={(e) => setForm((f) => ({ ...f, assetType: e.target.value }))}>
              <option value="">— keine Angabe —</option>
              {(Object.keys(ASSET_TYPE_LABELS) as (keyof typeof ASSET_TYPE_LABELS)[]).map((k) => (
                <option key={k} value={k}>{ASSET_TYPE_LABELS[k]}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Baujahr</Label>
            <Input
              inputMode="numeric"
              placeholder="z. B. 1998"
              value={form.yearBuilt}
              onChange={(e) => setForm((f) => ({ ...f, yearBuilt: e.target.value }))}
            />
          </div>
          <div>
            <Label>Einheiten (Anzahl)</Label>
            <Input
              inputMode="numeric"
              placeholder="z. B. 6"
              value={form.units}
              onChange={(e) => setForm((f) => ({ ...f, units: e.target.value }))}
            />
          </div>
          <div>
            <Label>Zustand</Label>
            <Select value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}>
              <option value="">— keine Angabe —</option>
              {(Object.keys(BUILDING_CONDITION_LABELS) as (keyof typeof BUILDING_CONDITION_LABELS)[]).map((k) => (
                <option key={k} value={k}>
                  {BUILDING_CONDITION_LABELS[k]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Energieklasse</Label>
            <Select value={form.energyClass} onChange={(e) => setForm((f) => ({ ...f, energyClass: e.target.value }))}>
              <option value="">— keine Angabe —</option>
              {(Object.keys(ENERGY_CLASS_LABELS) as (keyof typeof ENERGY_CLASS_LABELS)[]).map((k) => (
                <option key={k} value={k}>
                  {ENERGY_CLASS_LABELS[k]}
                </option>
              ))}
            </Select>
          </div>
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
