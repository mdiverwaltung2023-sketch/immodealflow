"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import { ASSET_TYPE_LABELS, type AssetTypeT, type AnonymizationLevelT } from "@/lib/api";

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

export function NewLeadWizard() {
  const router = useRouter();
  const apiFetch = useApiFetch();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [propertyType, setPropertyType] = useState<AssetTypeT>("MFH");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [district, setDistrict] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [anonymizationLevel, setAnonymizationLevel] =
    useState<AnonymizationLevelT>("CITY_ONLY");
  const [approxArea, setApproxArea] = useState<number>(0);
  const [approxPrice, setApproxPrice] = useState<number>(0);
  const [approxRent, setApproxRent] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [highlights, setHighlights] = useState<string[]>(["Off-Market", "Diskret"]);

  const valid1 = title.length >= 3 && city.length >= 2 && approxArea > 0 && approxPrice > 0;
  const valid2 = description.length >= 20;

  function toggleHighlight(h: string) {
    setHighlights((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));
  }

  async function submit(asDraft: boolean) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch("/me/offmarket-leads", {
        method: "POST",
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
          highlights,
          status: asDraft ? "DRAFT" : "ACTIVE"
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const lead = await res.json();
      router.push(`/offmarket/leads/${lead.id}`);
    } catch (e) {
      setError((e as Error).message || "Fehler beim Anlegen");
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      {/* Stepper */}
      <div className="mb-6 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={
                s <= step
                  ? "flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white"
                  : "flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500"
              }
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={
                  s < step ? "h-0.5 flex-1 bg-amber-500" : "h-0.5 flex-1 bg-zinc-200"
                }
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            Eckdaten der Immobilie
          </h2>

          <Field label="Interner Titel" hint="Nur Sie sehen das. Investoren bekommen anonymisierte Sicht.">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="z.B. 8-Familien-Bestand Hamburg-Eimsbüttel"
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Stadt">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Hamburg"
              />
            </Field>
            <Field label="PLZ (optional)">
              <input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="20251"
              />
            </Field>
          </div>

          <Field label="Stadtteil (optional)">
            <input
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Eimsbüttel"
            />
          </Field>

          <Field
            label="Volle Adresse (intern, optional)"
            hint="Nur sichtbar nach Doppel-Freigabe. Können Sie später eintragen."
          >
            <input
              value={fullAddress}
              onChange={(e) => setFullAddress(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Hoheluftchaussee 42"
            />
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
                placeholder="2400000"
              />
            </Field>
            <Field label="Ist-Miete (€/Mon., optional)">
              <input
                type="number"
                min={0}
                value={approxRent || ""}
                onChange={(e) => setApproxRent(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="9500"
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!valid1}
              onClick={() => setStep(2)}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Weiter →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            Anonymisierung + Beschreibung
          </h2>

          <Field
            label="Wie diskret soll es sein?"
            hint="Investoren in der PENDING-Phase sehen nur die gewählte Anonymisierungsstufe."
          >
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
          </Field>

          <Field label="Anonymisierte Beschreibung für Investoren">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="z.B. Solides MFH in zentraler Lage, voll vermietet, Mietsteigerungspotenzial durch unter-marktrechtliche Bestandsverträge. Verkauf wegen Erbteilung, kurzfristig möglich."
            />
            <div className="mt-1 text-[11px] text-zinc-500">
              {description.length} / 8000 Zeichen
            </div>
          </Field>

          <Field label="Highlights (optional)">
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
          </Field>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600"
            >
              ← Zurück
            </button>
            <button
              type="button"
              disabled={!valid2}
              onClick={() => setStep(3)}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Weiter →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">Zusammenfassung</h2>

          <Summary label="Titel">{title}</Summary>
          <Summary label="Objekttyp">{ASSET_TYPE_LABELS[propertyType]}</Summary>
          <Summary label="Lage">
            {city}
            {district && ` · ${district}`}
            {postalCode && ` · ${postalCode}`}
          </Summary>
          <Summary label="Eckdaten">
            {approxArea} m² · {approxPrice.toLocaleString("de-DE")} €
            {approxRent ? ` · ${approxRent.toLocaleString("de-DE")} €/Mon Miete` : ""}
          </Summary>
          <Summary label="Anonymisierung">
            {anonymizationLevel === "CITY_ONLY"
              ? "Nur Stadt"
              : anonymizationLevel === "DISTRICT_ONLY"
                ? "Stadt + Stadtteil"
                : "Volle Adresse"}
          </Summary>
          <Summary label="Beschreibung">
            <div className="whitespace-pre-line text-sm">{description}</div>
          </Summary>
          {highlights.length > 0 && (
            <Summary label="Highlights">
              <div className="flex flex-wrap gap-1">
                {highlights.map((h) => (
                  <span
                    key={h}
                    className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </Summary>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
            <strong>Tipp:</strong> Als <em>Entwurf</em> bleibt das Inserat
            unsichtbar, bis Sie selbst Investoren einladen. <em>Aktiv</em> macht
            es bereit für sofortige Einladungen — Investoren sehen es trotzdem
            nur, wenn Sie sie konkret auswählen.
          </div>

          <div className="flex flex-wrap justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600"
            >
              ← Zurück
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => submit(true)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50"
              >
                Als Entwurf speichern
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => submit(false)}
                className="rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
              >
                Aktivieren + Investoren matchen →
              </button>
            </div>
          </div>
        </div>
      )}
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

function Summary({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm text-zinc-900">{children}</div>
    </div>
  );
}
