"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import {
  ASSET_TYPE_LABELS,
  AssetTypeEnum,
  type AssetTypeT
} from "@/lib/api";

const ASSET_TYPES = AssetTypeEnum.options;

export function MarketplaceFilters({
  initial
}: {
  initial: {
    city: string;
    type: AssetTypeT | "";
    priceMin: string;
    priceMax: string;
    areaMin: string;
  };
}) {
  const router = useRouter();
  const [city, setCity] = useState(initial.city);
  const [type, setType] = useState<AssetTypeT | "">(initial.type);
  const [priceMin, setPriceMin] = useState(initial.priceMin);
  const [priceMax, setPriceMax] = useState(initial.priceMax);
  const [areaMin, setAreaMin] = useState(initial.areaMin);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    if (type) params.set("type", type);
    if (priceMin && /^\d+$/.test(priceMin)) params.set("priceMin", priceMin);
    if (priceMax && /^\d+$/.test(priceMax)) params.set("priceMax", priceMax);
    if (areaMin && /^\d+(\.\d+)?$/.test(areaMin)) params.set("areaMin", areaMin);
    const qs = params.toString();
    router.push(qs ? `/marketplace?${qs}` : "/marketplace");
  }

  function reset() {
    setCity("");
    setType("");
    setPriceMin("");
    setPriceMax("");
    setAreaMin("");
    router.push("/marketplace");
  }

  return (
    <form onSubmit={apply} className="grid gap-3 md:grid-cols-5">
      <div>
        <Label>Stadt</Label>
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Berlin" />
      </div>
      <div>
        <Label>Asset-Typ</Label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AssetTypeT | "")}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="">Alle</option>
          {ASSET_TYPES.map((t) => (
            <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>
      <div>
        <Label>Preis ab (EUR)</Label>
        <Input
          inputMode="numeric"
          value={priceMin}
          onChange={(e) => setPriceMin(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="z. B. 500000"
        />
      </div>
      <div>
        <Label>Preis bis (EUR)</Label>
        <Input
          inputMode="numeric"
          value={priceMax}
          onChange={(e) => setPriceMax(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="z. B. 5000000"
        />
      </div>
      <div>
        <Label>Min. Fläche (m²)</Label>
        <Input
          inputMode="decimal"
          value={areaMin}
          onChange={(e) => setAreaMin(e.target.value)}
          placeholder="z. B. 200"
        />
      </div>
      <div className="md:col-span-5 flex flex-wrap items-center gap-2">
        <Button type="submit">Filter anwenden</Button>
        <Button type="button" variant="secondary" onClick={reset}>
          Zurücksetzen
        </Button>
      </div>
    </form>
  );
}
