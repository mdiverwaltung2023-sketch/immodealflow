"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import {
  FINANCING_PARTNER_TYPE_LABELS,
  FinancingPartnerTypeEnum,
  ASSET_TYPE_LABELS,
  type FinancingPartnerT,
  type FinancingPartnerTypeT,
  type AssetTypeT
} from "@/lib/api";
import { useApiFetch } from "@/lib/client-fetch";

function eur(n: number | null) {
  if (n == null) return "–";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}
function num(v: string): number | null {
  const n = Number(v.replace(/[.\s]/g, "").replace(",", "."));
  return v.trim() && Number.isFinite(n) ? Math.round(n) : null;
}

const EMPTY = {
  name: "",
  type: "BANK" as FinancingPartnerTypeT,
  regions: "",
  minVolume: "",
  maxVolume: "",
  maxLtv: "",
  note: "",
  assetTypes: [] as AssetTypeT[]
};

export function PartnerManager({ initial }: { initial: FinancingPartnerT[] }) {
  const apiFetch = useApiFetch();
  const router = useRouter();
  const [items, setItems] = useState<FinancingPartnerT[]>(initial);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Name fehlt.");
      return;
    }
    setBusy(true);
    try {
      const ltv = form.maxLtv.trim() ? Number(form.maxLtv.replace(",", ".")) / 100 : null;
      const body = {
        name: form.name.trim(),
        type: form.type,
        regions: form.regions
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean),
        minVolume: num(form.minVolume),
        maxVolume: num(form.maxVolume),
        maxLtv: ltv,
        note: form.note.trim() || null,
        assetTypes: form.assetTypes
      };
      const res = await apiFetch("/admin/financing-partners", {
        method: "POST",
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`Fehlgeschlagen (${res.status})`);
      setForm(EMPTY);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function seed() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/admin/financing-partners/seed-demo", { method: "POST" });
      if (!res.ok) throw new Error(`Fehlgeschlagen (${res.status})`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Partner wirklich löschen?")) return;
    setError(null);
    try {
      const res = await apiFetch(`/admin/financing-partners/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`Fehlgeschlagen (${res.status})`);
      setItems((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={seed} disabled={busy}>
          Demo-Partner laden
        </Button>
        {error ? <span className="text-sm text-rose-600">{error}</span> : null}
      </div>

      {/* Liste */}
      {items.length === 0 ? (
        <div className="text-sm text-zinc-500">Noch keine Partner. Lege unten welche an.</div>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200">
          {items.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-900">{p.name}</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                    {FINANCING_PARTNER_TYPE_LABELS[p.type]}
                  </span>
                  {!p.active ? (
                    <span className="text-xs text-rose-600">inaktiv</span>
                  ) : null}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  {p.regions.length > 0 ? `${p.regions.join(", ")} · ` : "bundesweit · "}
                  {p.maxLtv != null ? `max. LTV ${(p.maxLtv * 100).toFixed(0)} % · ` : ""}
                  Volumen {eur(p.minVolume)}–{eur(p.maxVolume)}
                </div>
              </div>
              <button
                onClick={() => remove(p.id)}
                className="text-zinc-400 hover:text-rose-600"
                title="Partner löschen"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Anlegen */}
      <form onSubmit={add} className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Partner anlegen
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Typ</Label>
            <Select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as FinancingPartnerTypeT }))}
            >
              {FinancingPartnerTypeEnum.options.map((t) => (
                <option key={t} value={t}>
                  {FINANCING_PARTNER_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Regionen (kommagetrennt; leer = bundesweit)</Label>
            <Input
              placeholder="z. B. Berlin, Brandenburg"
              value={form.regions}
              onChange={(e) => setForm((f) => ({ ...f, regions: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Objektarten (leer = alle)</Label>
            <div className="flex flex-wrap gap-3 pt-1">
              {(Object.keys(ASSET_TYPE_LABELS) as AssetTypeT[]).map((k) => (
                <label key={k} className="flex items-center gap-1 text-xs text-zinc-700">
                  <input type="checkbox" checked={form.assetTypes.includes(k)} onChange={(e) => setForm((f) => ({ ...f, assetTypes: e.target.checked ? [...f.assetTypes, k] : f.assetTypes.filter((x) => x !== k) }))} />
                  {ASSET_TYPE_LABELS[k]}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>Min. Volumen (EUR)</Label>
            <Input inputMode="numeric" value={form.minVolume} onChange={(e) => setForm((f) => ({ ...f, minVolume: e.target.value }))} />
          </div>
          <div>
            <Label>Max. Volumen (EUR)</Label>
            <Input inputMode="numeric" value={form.maxVolume} onChange={(e) => setForm((f) => ({ ...f, maxVolume: e.target.value }))} />
          </div>
          <div>
            <Label>Max. Beleihung (LTV, %)</Label>
            <Input inputMode="decimal" placeholder="z. B. 85" value={form.maxLtv} onChange={(e) => setForm((f) => ({ ...f, maxLtv: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <Label>Notiz</Label>
            <Textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          </div>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Speichere…" : "Partner anlegen"}
        </Button>
      </form>
    </div>
  );
}
