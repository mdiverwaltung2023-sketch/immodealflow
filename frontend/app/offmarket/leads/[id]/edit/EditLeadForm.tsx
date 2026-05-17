"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import {
  ASSET_TYPE_LABELS,
  type AssetTypeT,
  type AnonymizationLevelT,
  type OffmarketLeadT
} from "@/lib/api";

const ASSET_TYPES: AssetTypeT[] = [
  "MFH",
  "COMMERCIAL",
  "MIXED_USE",
  "SINGLE_FAMILY",
  "APARTMENT",
  "LAND",
  "OTHER"
];

const HIGHLIGHT_PRESETS = [
  "Vollvermietet",
  "Erbe / Nachfolge",
  "Off-Market",
  "Diskret",
  "Renditestark",
  "Entwicklungspotenzial",
  "Mietsteigerungspotenzial",
  "Sanierungsbedarf",
  "Top-Lage",
  "Cashflow-positiv"
];

export function EditLeadForm({ lead }: { lead: OffmarketLeadT }) {
  const router = useRouter();
  const apiFetch = useApiFetch();

  const [title, setTitle] = useState(lead.title);
  const [propertyType, setPropertyType] = useState<AssetTypeT>(
    lead.propertyType as AssetTypeT
  );
  const [city, setCity] = useState(lead.city);
  const [postalCode, setPostalCode] = useState(lead.postalCode ?? "");
  const [district, setDistrict] = useState(lead.district ?? "");
  const [fullAddress, setFullAddress] = useState(lead.fullAddress ?? "");
  const [anonymizationLevel, setAnonymizationLevel] =
    useState<AnonymizationLevelT>(lead.anonymizationLevel as AnonymizationLevelT);
  const [approxArea, setApproxArea] = useState<number>(lead.approxArea);
  const [approxPrice, setApproxPrice] = useState<number>(lead.approxPrice);
  const [approxRent, setApproxRent] = useState<number>(lead.approxRent ?? 0);
  const [description, setDescription] = useState(lead.description);
  const [highlights, setHighlights] = useState<string[]>(
    Array.isArray(lead.highlights) ? lead.highlights : []
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function toggleHighlight(h: string) {
    setHighlights((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]
    );
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/me/offmarket-leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          propertyType,
          city,
          postalCode: postalCode || null,
          district: district || null,
          fullAddress: fullAddress || null,
          anonymizationLevel,
          approxArea,
          approxPrice,
          approxRent: approxRent || null,
          description,
          highlights
        })
      });
      if (!res.ok) throw new Error(await res.text());
      setSavedAt(new Date());
      router.refresh();
    } catch (e) {
      setError((e as Error).message || "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function saveAndExit() {
    await save();
    if (!error) router.push(`/offmarket/leads/${lead.id}`);
  }

  return (
    <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <Section title="Eckdaten">
        <Field label="Interner Titel">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Objekttyp">
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value as AssetTypeT)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {ASSET_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Fläche (m²)">
            <input
              type="number"
              min={0}
              value={approxArea || ""}
              onChange={(e) => setApproxArea(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Wunschpreis (€)">
            <input
              type="number"
              min={0}
              value={approxPrice || ""}
              onChange={(e) => setApproxPrice(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Ist-Miete (€/Mon., optional)">
            <input
              type="number"
              min={0}
              value={approxRent || ""}
              onChange={(e) => setApproxRent(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </Field>
        </div>
      </Section>

      <Section title="Lage">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stadt">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="PLZ (optional)">
            <input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </Field>
        </div>
        <Field label="Stadtteil (optional)">
          <input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field
          label="Volle Adresse (intern, optional)"
          hint="Nur sichtbar nach Doppel-Freigabe einer Einladung."
        >
          <input
            value={fullAddress}
            onChange={(e) => setFullAddress(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </Field>
      </Section>

      <Section title="Anonymisierung">
        <div className="grid gap-2 lg:grid-cols-3">
          {(
            [
              { v: "CITY_ONLY", t: "Nur Stadt", h: "Maximale Diskretion" },
              { v: "DISTRICT_ONLY", t: "Stadt + Stadtteil", h: "Mittlere Diskretion" },
              { v: "FULL_ADDRESS", t: "Volle Adresse", h: "Keine Anonymisierung" }
            ] as const
          ).map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setAnonymizationLevel(opt.v as AnonymizationLevelT)}
              className={
                anonymizationLevel === opt.v
                  ? "rounded-lg border-2 border-amber-500 bg-amber-50 p-3 text-left"
                  : "rounded-lg border border-zinc-200 bg-white p-3 text-left hover:border-zinc-300"
              }
            >
              <div className="text-sm font-semibold text-zinc-900">{opt.t}</div>
              <div className="mt-0.5 text-[11px] text-zinc-500">{opt.h}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Beschreibung">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <div className="mt-1 text-[11px] text-zinc-500">
          {description.length} / 8000 Zeichen
        </div>
      </Section>

      <Section title="Highlights">
        <div className="flex flex-wrap gap-1.5">
          {HIGHLIGHT_PRESETS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => toggleHighlight(h)}
              className={
                highlights.includes(h)
                  ? "rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"
                  : "rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 hover:border-amber-300"
              }
            >
              {h}
            </button>
          ))}
        </div>
        {highlights.some((h) => !HIGHLIGHT_PRESETS.includes(h)) && (
          <div className="mt-2 text-[11px] text-zinc-500">
            Eigene Tags:{" "}
            {highlights
              .filter((h) => !HIGHLIGHT_PRESETS.includes(h))
              .join(", ")}
          </div>
        )}
      </Section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {savedAt && !error && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Gespeichert um {savedAt.toLocaleTimeString("de-DE")}.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 pt-4">
        <button
          type="button"
          onClick={() => router.push(`/offmarket/leads/${lead.id}`)}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
        >
          Abbrechen
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50"
        >
          {busy ? "Speichert..." : "Speichern"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={saveAndExit}
          className="rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
        >
          Speichern + zurück
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-700">{label}</label>
      {hint && <div className="mt-0.5 text-[11px] text-zinc-500">{hint}</div>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
