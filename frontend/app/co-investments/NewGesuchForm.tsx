"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import {
  ASSET_TYPE_LABELS,
  INVEST_STRATEGY_LABELS,
  type AssetTypeT,
  type InvestStrategyT
} from "@/lib/api";

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500";
const labelCls = "mb-1 block text-xs font-medium text-slate-600";

function toIntOrUndef(v: string): number | undefined {
  const n = parseInt(v.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : undefined;
}
function toFloatOrUndef(v: string): number | undefined {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

export function NewGesuchForm() {
  const apiFetch = useApiFetch();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [assetType, setAssetType] = useState("");
  const [location, setLocation] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [equityAvailable, setEquityAvailable] = useState("");
  const [capitalNeed, setCapitalNeed] = useState("");
  const [strategy, setStrategy] = useState("");
  const [holdingPeriodYears, setHoldingPeriodYears] = useState("");
  const [targetReturnPct, setTargetReturnPct] = useState("");
  const [description, setDescription] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 3) {
      setError("Bitte einen Titel mit mindestens 3 Zeichen angeben.");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { title: title.trim() };
      if (assetType) body.assetType = assetType;
      if (location.trim()) body.location = location.trim();
      const pp = toIntOrUndef(purchasePrice);
      if (pp !== undefined) body.purchasePrice = pp;
      const eq = toIntOrUndef(equityAvailable);
      if (eq !== undefined) body.equityAvailable = eq;
      const cn = toIntOrUndef(capitalNeed);
      if (cn !== undefined) body.capitalNeed = cn;
      if (strategy) body.strategy = strategy;
      const hp = toIntOrUndef(holdingPeriodYears);
      if (hp !== undefined) body.holdingPeriodYears = hp;
      const tr = toFloatOrUndef(targetReturnPct);
      if (tr !== undefined) body.targetReturnPct = tr;
      if (description.trim()) body.description = description.trim();

      const res = await apiFetch("/me/coinvest-requests", {
        method: "POST",
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`Speichern fehlgeschlagen (${res.status})`);

      setTitle(""); setAssetType(""); setLocation(""); setPurchasePrice("");
      setEquityAvailable(""); setCapitalNeed(""); setStrategy("");
      setHoldingPeriodYears(""); setTargetReturnPct(""); setDescription("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={labelCls}>Titel *</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="z. B. MFH Leipzig-Plagwitz, 12 Einheiten" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Objektart</label>
          <select className={inputCls} value={assetType} onChange={(e) => setAssetType(e.target.value)}>
            <option value="">— wählen —</option>
            {(Object.keys(ASSET_TYPE_LABELS) as AssetTypeT[]).map((k) => (
              <option key={k} value={k}>{ASSET_TYPE_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Standort</label>
          <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)}
            placeholder="z. B. Leipzig / Sachsen" />
        </div>
        <div>
          <label className={labelCls}>Strategie</label>
          <select className={inputCls} value={strategy} onChange={(e) => setStrategy(e.target.value)}>
            <option value="">— wählen —</option>
            {(Object.keys(INVEST_STRATEGY_LABELS) as InvestStrategyT[]).map((k) => (
              <option key={k} value={k}>{INVEST_STRATEGY_LABELS[k]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Kaufpreis (€)</label>
          <input className={inputCls} value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)}
            inputMode="numeric" placeholder="1.800.000" />
        </div>
        <div>
          <label className={labelCls}>Eigenkapital vorhanden (€)</label>
          <input className={inputCls} value={equityAvailable} onChange={(e) => setEquityAvailable(e.target.value)}
            inputMode="numeric" placeholder="300.000" />
        </div>
        <div>
          <label className={labelCls}>Kapitalbedarf (€)</label>
          <input className={inputCls} value={capitalNeed} onChange={(e) => setCapitalNeed(e.target.value)}
            inputMode="numeric" placeholder="450.000" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Haltedauer (Jahre)</label>
          <input className={inputCls} value={holdingPeriodYears} onChange={(e) => setHoldingPeriodYears(e.target.value)}
            inputMode="numeric" placeholder="10" />
        </div>
        <div>
          <label className={labelCls}>Renditeerwartung (%)</label>
          <input className={inputCls} value={targetReturnPct} onChange={(e) => setTargetReturnPct(e.target.value)}
            inputMode="decimal" placeholder="5.5" />
        </div>
      </div>

      <div>
        <label className={labelCls}>Beschreibung</label>
        <textarea className={inputCls} rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Objekt, Strategie, was du vom Partner suchst …" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
          {saving ? "Speichern …" : "Gesuch als Entwurf anlegen"}
        </button>
        <span className="text-xs text-slate-400">Wird als Entwurf gespeichert — danach veröffentlichen.</span>
      </div>
    </form>
  );
}
