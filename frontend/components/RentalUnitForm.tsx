"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import { Button, Input, Textarea, Label, Select } from "@/components/ui";
import {
  ENERGY_CLASS_LABELS,
  ENERGY_CARRIER_LABELS,
  RENTAL_STATUS_LABELS,
  RENTAL_STATUS_ORDER,
  type EnergyClassT,
  type EnergyCarrierT,
  type RentalUnitT,
  type RentalStatusT
} from "@/lib/api";

/**
 * Wiederverwendbare Vermieter-Inserat-Form (Phase L5.3).
 * Sektioniert in 6 Bloecke — analog zu NewListingForm v2 fuer den
 * Verkauf, aber fuer Mietobjekte mit Vermietungs-spezifischen Feldern.
 *
 * Wenn `initial` gesetzt -^> Edit-Modus (PATCH /me/rental-units/:id).
 * Sonst -^> Create-Modus (POST /me/rental-units, danach Redirect).
 */

const ENERGY_CLASSES: EnergyClassT[] = [
  "A_PLUS", "A", "B", "C", "D", "E", "F", "G", "H"
];
const ENERGY_CARRIERS: EnergyCarrierT[] = [
  "GAS",
  "OIL",
  "ELECTRIC",
  "DISTRICT_HEATING",
  "HEAT_PUMP",
  "PELLETS",
  "WOOD",
  "SOLAR",
  "OTHER"
];
const PARKING_TYPES = ["KEINER", "STELLPLATZ", "GARAGE", "TIEFGARAGE"] as const;
const PARKING_LABELS: Record<(typeof PARKING_TYPES)[number], string> = {
  KEINER: "Kein Stellplatz",
  STELLPLATZ: "Stellplatz",
  GARAGE: "Garage",
  TIEFGARAGE: "Tiefgarage"
};
const PETS_OPTIONS = ["NACH_ABSPRACHE", "JA", "NEIN"] as const;

type FormState = {
  // Eckdaten
  title: string;
  description: string;
  city: string;
  district: string;
  postalCode: string;
  fullAddress: string;
  rooms: string;
  livingArea: string;
  floor: string;

  // Bausubstanz
  yearBuilt: string;
  lastRenovation: string;
  totalUnits: string;
  bathrooms: string;
  separateGuestWc: boolean;

  // Aussenflaechen + Komfort
  balcony: boolean;
  balconyArea: string;
  terrace: boolean;
  terraceArea: string;
  garden: boolean;
  gardenShared: boolean;
  cellar: boolean;
  attic: boolean;
  elevator: boolean;
  barrierFree: boolean;
  furnished: boolean;
  partlyFurnished: boolean;
  kitchenIncluded: boolean;
  kitchenBuyOut: string;

  // Miete + Kaution
  rentCold: string;
  utilities: string;
  totalRent: string;
  deposit: string;
  depositMonths: string;
  parkingType: string;
  parkingCost: string;

  // Energie
  energyClass: string;
  energyConsumption: string;
  energyCarrier: string;
  heatingType: string;

  // Konditionen
  status: RentalStatusT;
  availableFrom: string;
  fixedTerm: boolean;
  fixedTermMonths: string;
  minRentDurationMonths: string;
  petsAllowed: (typeof PETS_OPTIONS)[number]; // tri-state mapping
  petsNote: string;
  internetAvailable: "JA" | "NEIN" | "UNBEKANNT";
  internetSpeed: string;
  conditions: string;
  features: string;
};

function fromInitial(initial: RentalUnitT | null): FormState {
  if (!initial) {
    return {
      title: "", description: "", city: "", district: "", postalCode: "", fullAddress: "",
      rooms: "", livingArea: "", floor: "",
      yearBuilt: "", lastRenovation: "", totalUnits: "", bathrooms: "",
      separateGuestWc: false,
      balcony: false, balconyArea: "", terrace: false, terraceArea: "",
      garden: false, gardenShared: false, cellar: false, attic: false,
      elevator: false, barrierFree: false, furnished: false, partlyFurnished: false,
      kitchenIncluded: false, kitchenBuyOut: "",
      rentCold: "", utilities: "", totalRent: "", deposit: "", depositMonths: "",
      parkingType: "KEINER", parkingCost: "",
      energyClass: "", energyConsumption: "", energyCarrier: "", heatingType: "",
      status: "DRAFT",
      availableFrom: "", fixedTerm: false, fixedTermMonths: "",
      minRentDurationMonths: "",
      petsAllowed: "NACH_ABSPRACHE",
      petsNote: "",
      internetAvailable: "UNBEKANNT",
      internetSpeed: "",
      conditions: "",
      features: ""
    };
  }
  const petsAllowed: FormState["petsAllowed"] =
    initial.petsAllowed === true
      ? "JA"
      : initial.petsAllowed === false
        ? "NEIN"
        : "NACH_ABSPRACHE";
  const internetAvailable: FormState["internetAvailable"] =
    initial.internetAvailable === true
      ? "JA"
      : initial.internetAvailable === false
        ? "NEIN"
        : "UNBEKANNT";
  return {
    title: initial.title,
    description: initial.description,
    city: initial.city,
    district: initial.district ?? "",
    postalCode: initial.postalCode ?? "",
    fullAddress: initial.fullAddress ?? "",
    rooms: String(initial.rooms),
    livingArea: String(initial.livingArea),
    floor: initial.floor ?? "",
    yearBuilt: initial.yearBuilt != null ? String(initial.yearBuilt) : "",
    lastRenovation:
      initial.lastRenovation != null ? String(initial.lastRenovation) : "",
    totalUnits: initial.totalUnits != null ? String(initial.totalUnits) : "",
    bathrooms: initial.bathrooms != null ? String(initial.bathrooms) : "",
    separateGuestWc: initial.separateGuestWc ?? false,
    balcony: initial.balcony ?? false,
    balconyArea: initial.balconyArea != null ? String(initial.balconyArea) : "",
    terrace: initial.terrace ?? false,
    terraceArea: initial.terraceArea != null ? String(initial.terraceArea) : "",
    garden: initial.garden ?? false,
    gardenShared: initial.gardenShared ?? false,
    cellar: initial.cellar ?? false,
    attic: initial.attic ?? false,
    elevator: initial.elevator ?? false,
    barrierFree: initial.barrierFree ?? false,
    furnished: initial.furnished ?? false,
    partlyFurnished: initial.partlyFurnished ?? false,
    kitchenIncluded: initial.kitchenIncluded ?? false,
    kitchenBuyOut:
      initial.kitchenBuyOut != null ? String(initial.kitchenBuyOut) : "",
    rentCold: String(initial.rentCold),
    utilities: initial.utilities != null ? String(initial.utilities) : "",
    totalRent: initial.totalRent != null ? String(initial.totalRent) : "",
    deposit: initial.deposit != null ? String(initial.deposit) : "",
    depositMonths:
      initial.depositMonths != null ? String(initial.depositMonths) : "",
    parkingType: initial.parkingType ?? "KEINER",
    parkingCost: initial.parkingCost != null ? String(initial.parkingCost) : "",
    energyClass: initial.energyClass ?? "",
    energyConsumption:
      initial.energyConsumption != null ? String(initial.energyConsumption) : "",
    energyCarrier: initial.energyCarrier ?? "",
    heatingType: initial.heatingType ?? "",
    status: initial.status,
    availableFrom: initial.availableFrom ? initial.availableFrom.slice(0, 10) : "",
    fixedTerm: initial.fixedTerm ?? false,
    fixedTermMonths:
      initial.fixedTermMonths != null ? String(initial.fixedTermMonths) : "",
    minRentDurationMonths:
      initial.minRentDurationMonths != null
        ? String(initial.minRentDurationMonths)
        : "",
    petsAllowed,
    petsNote: initial.petsNote ?? "",
    internetAvailable,
    internetSpeed: initial.internetSpeed ?? "",
    conditions: initial.conditions ?? "",
    features: (initial.features ?? []).join(", ")
  };
}

function toBody(f: FormState): Record<string, unknown> {
  const num = (s: string): number | undefined => {
    if (s.trim() === "") return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  };
  const intOrNull = (s: string): number | null | undefined => {
    if (s.trim() === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n) : null;
  };
  const floatOrNull = (s: string): number | null | undefined => {
    if (s.trim() === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };
  const strOrNull = (s: string): string | null => (s.trim() === "" ? null : s.trim());

  const body: Record<string, unknown> = {
    title: f.title.trim(),
    description: f.description.trim(),
    city: f.city.trim(),
    district: strOrNull(f.district),
    postalCode: strOrNull(f.postalCode),
    fullAddress: strOrNull(f.fullAddress),
    rooms: num(f.rooms),
    livingArea: num(f.livingArea),
    floor: strOrNull(f.floor),
    yearBuilt: intOrNull(f.yearBuilt),
    lastRenovation: intOrNull(f.lastRenovation),
    totalUnits: intOrNull(f.totalUnits),
    bathrooms: intOrNull(f.bathrooms),
    separateGuestWc: f.separateGuestWc,
    balcony: f.balcony,
    balconyArea: floatOrNull(f.balconyArea),
    terrace: f.terrace,
    terraceArea: floatOrNull(f.terraceArea),
    garden: f.garden,
    gardenShared: f.gardenShared,
    cellar: f.cellar,
    attic: f.attic,
    elevator: f.elevator,
    barrierFree: f.barrierFree,
    furnished: f.furnished,
    partlyFurnished: f.partlyFurnished,
    kitchenIncluded: f.kitchenIncluded,
    kitchenBuyOut: intOrNull(f.kitchenBuyOut),
    rentCold: num(f.rentCold) != null ? Math.round(num(f.rentCold) as number) : undefined,
    utilities: intOrNull(f.utilities),
    totalRent: intOrNull(f.totalRent),
    deposit: intOrNull(f.deposit),
    depositMonths: floatOrNull(f.depositMonths),
    parkingType:
      f.parkingType && f.parkingType !== "KEINER" ? f.parkingType : null,
    parkingCost: intOrNull(f.parkingCost),
    energyClass: f.energyClass || null,
    energyConsumption: floatOrNull(f.energyConsumption),
    energyCarrier: f.energyCarrier || null,
    heatingType: strOrNull(f.heatingType),
    status: f.status,
    availableFrom: f.availableFrom ? new Date(f.availableFrom).toISOString() : null,
    fixedTerm: f.fixedTerm,
    fixedTermMonths: f.fixedTerm ? intOrNull(f.fixedTermMonths) : null,
    minRentDurationMonths: intOrNull(f.minRentDurationMonths),
    petsAllowed:
      f.petsAllowed === "JA"
        ? true
        : f.petsAllowed === "NEIN"
          ? false
          : null,
    petsNote: strOrNull(f.petsNote),
    internetAvailable:
      f.internetAvailable === "JA"
        ? true
        : f.internetAvailable === "NEIN"
          ? false
          : null,
    internetSpeed: strOrNull(f.internetSpeed),
    conditions: strOrNull(f.conditions),
    features: f.features
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  };
  return body;
}

export function RentalUnitForm({
  initial,
  mode
}: {
  initial: RentalUnitT | null;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [f, setF] = useState<FormState>(() => fromInitial(initial));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setMsg(null);

    if (!f.title.trim()) {
      setMsg({ kind: "err", text: "Titel ist Pflicht." });
      return;
    }
    if (!f.city.trim()) {
      setMsg({ kind: "err", text: "Stadt ist Pflicht." });
      return;
    }
    if (!f.rooms.trim() || Number(f.rooms) <= 0) {
      setMsg({ kind: "err", text: "Bitte gültige Zimmeranzahl angeben." });
      return;
    }
    if (!f.livingArea.trim() || Number(f.livingArea) <= 0) {
      setMsg({ kind: "err", text: "Bitte gültige Wohnfläche angeben." });
      return;
    }
    if (!f.rentCold.trim() || Number(f.rentCold) < 0) {
      setMsg({ kind: "err", text: "Bitte gültige Kaltmiete angeben." });
      return;
    }

    const body = toBody(f);

    setBusy(true);
    try {
      const url =
        mode === "edit" && initial
          ? `/me/rental-units/${initial.id}`
          : "/me/rental-units";
      const method = mode === "edit" ? "PATCH" : "POST";
      const r = await apiFetch(url, {
        method,
        body: JSON.stringify(body)
      });
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        setMsg({ kind: "err", text: j?.error ?? `Fehler ${r.status}` });
        return;
      }
      const result = (await r.json()) as { id: string };
      if (mode === "create") {
        router.push(`/rentals/${result.id}`);
      } else {
        setMsg({ kind: "ok", text: "Gespeichert." });
        router.refresh();
      }
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Fehler" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      {/* Section 1: Eckdaten */}
      <Section title="1. Eckdaten" subtitle="Pflicht: Titel, Stadt, Zimmer, Wohnfläche, Kaltmiete">
        <div>
          <Label>Titel *</Label>
          <Input
            value={f.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="z. B. Helle 3-Zi-Wohnung mit Balkon, Berlin Friedrichshain"
            required
          />
        </div>
        <div>
          <Label>Beschreibung</Label>
          <Textarea
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Wohnung, Lage, Besonderheiten — bitte keine sensiblen Mieter-Anforderungen."
            className="min-h-[120px]"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Stadt *</Label>
            <Input value={f.city} onChange={(e) => set("city", e.target.value)} required />
          </div>
          <div>
            <Label>Stadtteil</Label>
            <Input value={f.district} onChange={(e) => set("district", e.target.value)} />
          </div>
          <div>
            <Label>PLZ</Label>
            <Input value={f.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Vollständige Adresse (intern, wird nicht öffentlich gezeigt)</Label>
          <Input
            value={f.fullAddress}
            onChange={(e) => set("fullAddress", e.target.value)}
            placeholder="Straße + Hausnummer"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Zimmer *</Label>
            <Input
              type="number"
              min={0.5}
              step={0.5}
              value={f.rooms}
              onChange={(e) => set("rooms", e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Wohnfläche (m²) *</Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={f.livingArea}
              onChange={(e) => set("livingArea", e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Etage</Label>
            <Input
              value={f.floor}
              onChange={(e) => set("floor", e.target.value)}
              placeholder="z. B. 3. OG, EG, DG"
            />
          </div>
        </div>
      </Section>

      {/* Section 2: Bausubstanz */}
      <Section title="2. Bausubstanz" subtitle="Optional, hilft bei Bewerber-Einschätzung">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Baujahr</Label>
            <Input type="number" min={1800} max={2100}
              value={f.yearBuilt} onChange={(e) => set("yearBuilt", e.target.value)} />
          </div>
          <div>
            <Label>Letzte Sanierung</Label>
            <Input type="number" min={1800} max={2100}
              value={f.lastRenovation} onChange={(e) => set("lastRenovation", e.target.value)} />
          </div>
          <div>
            <Label>Wohneinheiten im Gebäude</Label>
            <Input type="number" min={1}
              value={f.totalUnits} onChange={(e) => set("totalUnits", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Bäder</Label>
            <Input type="number" min={0}
              value={f.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} />
          </div>
          <Bool label="Separates Gäste-WC" value={f.separateGuestWc}
            onChange={(v) => set("separateGuestWc", v)} />
        </div>
      </Section>

      {/* Section 3: Außen + Komfort */}
      <Section title="3. Außenflächen + Komfort">
        <div className="grid gap-3 md:grid-cols-4">
          <Bool label="Balkon" value={f.balcony} onChange={(v) => set("balcony", v)} />
          <div>
            <Label>Balkon-Fläche (m²)</Label>
            <Input type="number" min={0} step={0.5} disabled={!f.balcony}
              value={f.balconyArea} onChange={(e) => set("balconyArea", e.target.value)} />
          </div>
          <Bool label="Terrasse" value={f.terrace} onChange={(v) => set("terrace", v)} />
          <div>
            <Label>Terrasse-Fläche (m²)</Label>
            <Input type="number" min={0} step={0.5} disabled={!f.terrace}
              value={f.terraceArea} onChange={(e) => set("terraceArea", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <Bool label="Garten" value={f.garden} onChange={(v) => set("garden", v)} />
          <Bool label="Gemeinschaftsgarten" value={f.gardenShared}
            onChange={(v) => set("gardenShared", v)} />
          <Bool label="Keller" value={f.cellar} onChange={(v) => set("cellar", v)} />
          <Bool label="Dachboden / Speicher" value={f.attic}
            onChange={(v) => set("attic", v)} />
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <Bool label="Aufzug" value={f.elevator} onChange={(v) => set("elevator", v)} />
          <Bool label="Barrierefrei" value={f.barrierFree}
            onChange={(v) => set("barrierFree", v)} />
          <Bool label="Möbliert" value={f.furnished}
            onChange={(v) => set("furnished", v)} />
          <Bool label="Teilmöbliert" value={f.partlyFurnished}
            onChange={(v) => set("partlyFurnished", v)} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Bool label="Einbauküche im Mietpreis" value={f.kitchenIncluded}
            onChange={(v) => set("kitchenIncluded", v)} />
          <div>
            <Label>Ablöse Küche (EUR, optional)</Label>
            <Input type="number" min={0} step={50}
              value={f.kitchenBuyOut} onChange={(e) => set("kitchenBuyOut", e.target.value)} />
          </div>
        </div>
      </Section>

      {/* Section 4: Miete + Kaution */}
      <Section title="4. Miete + Kaution + Stellplatz">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Kaltmiete (EUR/Mon.) *</Label>
            <Input type="number" min={0} step={10}
              value={f.rentCold} onChange={(e) => set("rentCold", e.target.value)} required />
          </div>
          <div>
            <Label>Nebenkosten (EUR/Mon.)</Label>
            <Input type="number" min={0} step={10}
              value={f.utilities} onChange={(e) => set("utilities", e.target.value)} />
          </div>
          <div>
            <Label>Warmmiete (EUR/Mon.)</Label>
            <Input type="number" min={0} step={10}
              value={f.totalRent} onChange={(e) => set("totalRent", e.target.value)}
              placeholder="optional, errechenbar" />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Kaution (EUR)</Label>
            <Input type="number" min={0} step={100}
              value={f.deposit} onChange={(e) => set("deposit", e.target.value)} />
          </div>
          <div>
            <Label>Kaution (Anzahl Kaltmieten)</Label>
            <Input type="number" min={0} max={6} step={0.5}
              value={f.depositMonths} onChange={(e) => set("depositMonths", e.target.value)}
              placeholder="z. B. 3.0" />
          </div>
          <div>
            <Label>Stellplatz</Label>
            <Select value={f.parkingType}
              onChange={(e) => set("parkingType", e.target.value)}>
              {PARKING_TYPES.map((p) => (
                <option key={p} value={p}>{PARKING_LABELS[p]}</option>
              ))}
            </Select>
          </div>
        </div>
        {f.parkingType && f.parkingType !== "KEINER" ? (
          <div>
            <Label>Stellplatz-Kosten (EUR/Mon., extra)</Label>
            <Input type="number" min={0} step={5}
              value={f.parkingCost} onChange={(e) => set("parkingCost", e.target.value)} />
          </div>
        ) : null}
      </Section>

      {/* Section 5: Energie */}
      <Section title="5. Energieausweis">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Energieklasse</Label>
            <Select value={f.energyClass}
              onChange={(e) => set("energyClass", e.target.value)}>
              <option value="">— nicht angegeben —</option>
              {ENERGY_CLASSES.map((c) => (
                <option key={c} value={c}>{ENERGY_CLASS_LABELS[c]}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Endenergiebedarf (kWh/m²a)</Label>
            <Input type="number" min={0} step={1}
              value={f.energyConsumption}
              onChange={(e) => set("energyConsumption", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Energieträger</Label>
            <Select value={f.energyCarrier}
              onChange={(e) => set("energyCarrier", e.target.value)}>
              <option value="">— nicht angegeben —</option>
              {ENERGY_CARRIERS.map((c) => (
                <option key={c} value={c}>{ENERGY_CARRIER_LABELS[c]}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Heizungstyp (Freitext)</Label>
            <Input value={f.heatingType}
              onChange={(e) => set("heatingType", e.target.value)}
              placeholder="z. B. Zentralheizung, Etagenheizung" />
          </div>
        </div>
      </Section>

      {/* Section 6: Konditionen */}
      <Section title="6. Vermietungs-Konditionen">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Status</Label>
            <Select value={f.status}
              onChange={(e) => set("status", e.target.value as RentalStatusT)}>
              {RENTAL_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{RENTAL_STATUS_LABELS[s]}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Verfügbar ab</Label>
            <Input type="date"
              value={f.availableFrom}
              onChange={(e) => set("availableFrom", e.target.value)} />
          </div>
          <div>
            <Label>Mindestmietdauer (Monate)</Label>
            <Input type="number" min={0}
              value={f.minRentDurationMonths}
              onChange={(e) => set("minRentDurationMonths", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Bool label="Befristet vermietet" value={f.fixedTerm}
            onChange={(v) => set("fixedTerm", v)} />
          <div>
            <Label>Befristung-Dauer (Monate)</Label>
            <Input type="number" min={1} max={360}
              disabled={!f.fixedTerm}
              value={f.fixedTermMonths}
              onChange={(e) => set("fixedTermMonths", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Haustiere</Label>
            <Select value={f.petsAllowed}
              onChange={(e) =>
                set("petsAllowed", e.target.value as FormState["petsAllowed"])
              }>
              <option value="NACH_ABSPRACHE">Nach Absprache</option>
              <option value="JA">Erlaubt</option>
              <option value="NEIN">Nicht erlaubt</option>
            </Select>
          </div>
          <div>
            <Label>Haustier-Notiz</Label>
            <Input value={f.petsNote}
              onChange={(e) => set("petsNote", e.target.value)}
              placeholder="z. B. Kleintiere ja, Hund auf Anfrage" />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Internet</Label>
            <Select value={f.internetAvailable}
              onChange={(e) =>
                set("internetAvailable", e.target.value as FormState["internetAvailable"])
              }>
              <option value="UNBEKANNT">Nicht angegeben</option>
              <option value="JA">Verfügbar</option>
              <option value="NEIN">Nicht verfügbar</option>
            </Select>
          </div>
          <div>
            <Label>Internet-Geschwindigkeit / Anbieter</Label>
            <Input value={f.internetSpeed}
              onChange={(e) => set("internetSpeed", e.target.value)}
              placeholder="z. B. Glasfaser 1 Gbit, DSL 50 Mbit" />
          </div>
        </div>
        <div>
          <Label>Mietbedingungen (Freitext, AGG-konform)</Label>
          <Textarea value={f.conditions}
            onChange={(e) => set("conditions", e.target.value)}
            placeholder="z. B. Nichtraucher-Wohnung, Kaution 3 KM, etc. Bitte keine diskriminierenden Anforderungen."
          />
        </div>
        <div>
          <Label>Tags / Highlights (Komma-getrennt)</Label>
          <Input value={f.features}
            onChange={(e) => set("features", e.target.value)}
            placeholder="Süd-Balkon, Holzdielen, ruhige Lage, Erstbezug nach Sanierung" />
        </div>
      </Section>

      {/* Submit */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4">
        {msg ? (
          <div
            className={`text-sm ${msg.kind === "ok" ? "text-emerald-700" : "text-rose-600"}`}
          >
            {msg.text}
          </div>
        ) : <span />}
        <Button type="submit" disabled={busy}>
          {busy
            ? "Speichere …"
            : mode === "create"
              ? "Anlegen & weiter"
              : "Speichern"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5">
      <legend className="px-2 text-sm font-semibold text-indigo-700">{title}</legend>
      {subtitle ? (
        <div className="-mt-2 text-xs text-zinc-500">{subtitle}</div>
      ) : null}
      {children}
    </fieldset>
  );
}

function Bool({
  label,
  value,
  onChange
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 cursor-pointer hover:border-zinc-300">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
