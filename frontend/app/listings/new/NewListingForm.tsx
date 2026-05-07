"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { useApiFetch } from "@/lib/client-fetch";
import {
  ASSET_TYPE_LABELS,
  AssetTypeEnum,
  type AssetTypeT
} from "@/lib/api";

const ASSET_TYPES = AssetTypeEnum.options;

function intInput(v: string): number {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

function floatInput(v: string): number {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export function NewListingForm() {
  const router = useRouter();
  const apiFetch = useApiFetch();

  const [title, setTitle] = useState("");
  const [propertyType, setPropertyType] = useState<AssetTypeT>("MFH");
  const [askingPrice, setAskingPrice] = useState("");
  const [totalArea, setTotalArea] = useState("");
  const [totalRent, setTotalRent] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [description, setDescription] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !city.trim()) {
      setError("Titel und Stadt sind Pflichtfelder.");
      return;
    }
    const price = intInput(askingPrice);
    const area = floatInput(totalArea);
    if (!Number.isFinite(price) || price < 0) {
      setError("Ungültiger Preis.");
      return;
    }
    if (!Number.isFinite(area) || area <= 0) {
      setError("Ungültige Größe.");
      return;
    }

    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        propertyType,
        askingPrice: price,
        totalArea: area,
        totalRent: totalRent ? intInput(totalRent) : null,
        city: city.trim(),
        district: district.trim() || null,
        anonymizationLevel: "DISTRICT_ONLY"
      };
      const res = await apiFetch("/me/listings", {
        method: "POST",
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Anlegen fehlgeschlagen (${res.status}) ${txt.slice(0, 200)}`);
      }
      const json = (await res.json()) as { id: string };
      router.push(`/listings/${json.id}/edit`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Titel</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z. B. Saniertes 12-Einheiten-MFH Berlin-Kreuzberg"
          />
        </div>
        <div>
          <Label>Asset-Typ</Label>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value as AssetTypeT)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Stadt</Label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="z. B. Berlin"
          />
        </div>
        <div>
          <Label>Stadtteil (optional)</Label>
          <Input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="z. B. Kreuzberg"
          />
        </div>
        <div>
          <Label>Angebotspreis (EUR)</Label>
          <Input
            inputMode="numeric"
            value={askingPrice}
            onChange={(e) => setAskingPrice(e.target.value)}
            placeholder="z. B. 4500000"
          />
        </div>
        <div>
          <Label>Gesamtfläche (m²)</Label>
          <Input
            inputMode="decimal"
            value={totalArea}
            onChange={(e) => setTotalArea(e.target.value)}
            placeholder="z. B. 720"
          />
        </div>
        <div>
          <Label>Gesamt-Sollmiete (EUR/Monat, optional)</Label>
          <Input
            inputMode="numeric"
            value={totalRent}
            onChange={(e) => setTotalRent(e.target.value)}
            placeholder="z. B. 18500"
          />
        </div>
      </div>

      <div>
        <Label>Beschreibung (optional jetzt — kannst du im Edit-Modus ergänzen)</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Lage, Zustand, Mieterstruktur, Modernisierungspotenzial…"
          className="min-h-[120px]"
        />
      </div>

      {error ? <div className="text-sm text-rose-600">{error}</div> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Lege an…" : "Als Entwurf anlegen"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => history.back()} disabled={busy}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
