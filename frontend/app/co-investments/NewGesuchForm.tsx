"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import {
  ASSET_TYPE_LABELS,
  INVEST_STRATEGY_LABELS,
  type AssetTypeT,
  type InvestStrategyT,
  type CoInvestKindT
} from "@/lib/api";
import { CoInvestVisual } from "./CoInvestVisual";

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

export function NewGesuchForm({ redirectOnSuccess = true }: { redirectOnSuccess?: boolean }) {
  const apiFetch = useApiFetch();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<CoInvestKindT>("OBJECT");
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [assetType, setAssetType] = useState("");
  const [location, setLocation] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [equityAvailable, setEquityAvailable] = useState("");
  const [capitalNeed, setCapitalNeed] = useState("");
  const [strategy, setStrategy] = useState("");
  const [holdingPeriodYears, setHoldingPeriodYears] = useState("");
  const [targetReturnPct, setTargetReturnPct] = useState("");
  const [description, setDescription] = useState("");

  const isObject = kind === "OBJECT";

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-image", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Upload fehlgeschlagen (${res.status})`);
      setImageUrl(data.url as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 3) {
      setError("Bitte einen Titel mit mindestens 3 Zeichen angeben.");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { kind, title: title.trim() };
      if (isObject && imageUrl) body.imageUrl = imageUrl;
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

      if (redirectOnSuccess) {
        router.push("/co-investments/meine");
        router.refresh();
        return;
      }
      setTitle(""); setImageUrl(""); setAssetType(""); setLocation(""); setPurchasePrice("");
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
    <form onSubmit={submit} className="space-y-5">
      {/* Art des Gesuchs */}
      <div>
        <label className={labelCls}>Art des Gesuchs</label>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setKind("OBJECT")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              isObject ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Konkretes Objekt
          </button>
          <button
            type="button"
            onClick={() => setKind("GENERAL")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              !isObject ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Allgemeine Suche
          </button>
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          {isObject
            ? "Du hast einen konkreten Deal und suchst Kapital-/Co-Investment-Partner — mit Bild und Eckdaten."
            : "Du suchst allgemein nach Co-Investment-Gelegenheiten nach deinen Kriterien — ohne konkretes Objekt."}
        </p>
      </div>

      <div>
        <label className={labelCls}>Titel *</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder={isObject ? "z. B. MFH Leipzig-Plagwitz, 12 Einheiten" : "z. B. Suche Value-Add MFH in Sachsen, Ticket 250–500k"} />
      </div>

      {/* Bild nur fuer Objekt-Gesuche */}
      {isObject && (
        <div>
          <label className={labelCls}>Objektbild</label>
          <div className="flex items-center gap-4">
            <div className="w-40 shrink-0">
              <CoInvestVisual imageUrl={imageUrl || null} assetType={assetType || null} heightCls="h-24" rounded="rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <label className="inline-block cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {uploading ? "Lädt …" : imageUrl ? "Bild ersetzen" : "Bild hochladen"}
                <input type="file" accept="image/*" className="hidden" onChange={onPickImage} disabled={uploading} />
              </label>
              {imageUrl && (
                <button type="button" onClick={() => setImageUrl("")}
                  className="ml-2 text-xs text-slate-400 hover:text-red-500">entfernen</button>
              )}
              <p className="text-xs text-slate-400">JPG/PNG, bis 4 MB. Ohne Bild zeigen wir eine Objektart-Grafik.</p>
            </div>
          </div>
        </div>
      )}

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
          <label className={labelCls}>{isObject ? "Standort" : "Wunsch-Region"}</label>
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
        {isObject && (
          <div>
            <label className={labelCls}>Kaufpreis (€)</label>
            <input className={inputCls} value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)}
              inputMode="numeric" placeholder="1.800.000" />
          </div>
        )}
        <div>
          <label className={labelCls}>Eigenkapital vorhanden (€)</label>
          <input className={inputCls} value={equityAvailable} onChange={(e) => setEquityAvailable(e.target.value)}
            inputMode="numeric" placeholder="300.000" />
        </div>
        <div>
          <label className={labelCls}>{isObject ? "Kapitalbedarf (€)" : "Gewünschtes Ticket (€)"}</label>
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
          placeholder={isObject ? "Objekt, Strategie, was du vom Partner suchst …" : "Welche Gelegenheiten suchst du? Erfahrung, Beteiligungsmodell, was du einbringst …"} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving || uploading}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
          {saving ? "Speichern …" : "Gesuch als Entwurf anlegen"}
        </button>
        <span className="text-xs text-slate-400">Wird als Entwurf gespeichert — danach veröffentlichen.</span>
      </div>
    </form>
  );
}
