"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { useApiFetch } from "@/lib/client-fetch";
import {
  ASSET_TYPE_LABELS,
  AssetTypeEnum,
  BUILDING_CONDITION_LABELS,
  BuildingConditionEnum,
  ENERGY_CARRIER_LABELS,
  EnergyCarrierEnum,
  ENERGY_CLASS_LABELS,
  EnergyClassEnum,
  type AssetTypeT,
  type BuildingConditionT,
  type EnergyCarrierT,
  type EnergyClassT
} from "@/lib/api";

const ASSET_TYPES = AssetTypeEnum.options;
const BUILDING_CONDITIONS = BuildingConditionEnum.options;
const ENERGY_CLASSES = EnergyClassEnum.options;
const ENERGY_CARRIERS = EnergyCarrierEnum.options;

function intInput(v: string): number {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : NaN;
}
function floatInput(v: string): number {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}
function intOrNull(s: string): number | null {
  if (!s.trim()) return null;
  const n = intInput(s);
  return Number.isFinite(n) ? n : null;
}
function floatOrNull(s: string): number | null {
  if (!s.trim()) return null;
  const n = floatInput(s);
  return Number.isFinite(n) ? n : null;
}
function tagsOrEmpty(s: string): string[] {
  return s.split(",").map((t) => t.trim()).filter((t) => t.length > 0).slice(0, 30);
}

export function NewListingForm() {
  const router = useRouter();
  const apiFetch = useApiFetch();

  // --- Eckdaten ---
  const [title, setTitle] = useState("");
  const [propertyType, setPropertyType] = useState<AssetTypeT>("MFH");
  const [askingPrice, setAskingPrice] = useState("");
  const [totalArea, setTotalArea] = useState("");
  const [totalRent, setTotalRent] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [description, setDescription] = useState("");

  // --- Bausubstanz ---
  const [yearBuilt, setYearBuilt] = useState("");
  const [lastRenovation, setLastRenovation] = useState("");
  const [condition, setCondition] = useState<BuildingConditionT | "">("");
  const [livingArea, setLivingArea] = useState("");
  const [commercialArea, setCommercialArea] = useState("");
  const [landArea, setLandArea] = useState("");
  const [floors, setFloors] = useState("");
  const [modernizationBacklog, setModernizationBacklog] = useState("");
  const [gegCompliant, setGegCompliant] = useState<"" | "yes" | "no">("");

  // --- Einheiten + Energie ---
  const [residentialUnits, setResidentialUnits] = useState("");
  const [commercialUnits, setCommercialUnits] = useState("");
  const [energyClass, setEnergyClass] = useState<EnergyClassT | "">("");
  const [energyConsumption, setEnergyConsumption] = useState("");
  const [energyCarrier, setEnergyCarrier] = useState<EnergyCarrierT | "">("");
  const [heatingType, setHeatingType] = useState("");

  // --- Vermietung (USP) ---
  const [actualRent, setActualRent] = useState("");
  const [vacancyRate, setVacancyRate] = useState("");
  const [waltMonths, setWaltMonths] = useState("");
  const [rentIndexed, setRentIndexed] = useState(false);
  const [rentEscalation, setRentEscalation] = useState(false);
  const [rentUpsidePotential, setRentUpsidePotential] = useState("");

  // --- Mieter-Mix ---
  const [tenantCount, setTenantCount] = useState("");
  const [anchorTenant, setAnchorTenant] = useState("");
  const [tenantSectors, setTenantSectors] = useState("");

  // --- Provision + Tags ---
  const [commissionFree, setCommissionFree] = useState(false);
  const [commissionRate, setCommissionRate] = useState("");
  const [features, setFeatures] = useState("");
  const [highlights, setHighlights] = useState("");

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
      const vacancyParsed = floatOrNull(vacancyRate);
      const body = {
        title: title.trim(),
        description: description.trim(),
        propertyType,
        askingPrice: price,
        totalArea: area,
        totalRent: totalRent ? intInput(totalRent) : null,
        city: city.trim(),
        district: district.trim() || null,
        anonymizationLevel: "DISTRICT_ONLY",

        // --- v2 ---
        yearBuilt: intOrNull(yearBuilt),
        lastRenovation: intOrNull(lastRenovation),
        condition: condition || null,
        livingArea: floatOrNull(livingArea),
        commercialArea: floatOrNull(commercialArea),
        landArea: floatOrNull(landArea),
        floors: intOrNull(floors),
        residentialUnits: intOrNull(residentialUnits),
        commercialUnits: intOrNull(commercialUnits),
        energyClass: energyClass || null,
        energyConsumption: floatOrNull(energyConsumption),
        energyCarrier: energyCarrier || null,
        heatingType: heatingType.trim() || null,
        actualRent: intOrNull(actualRent),
        vacancyRate: vacancyParsed != null ? Math.max(0, Math.min(1, vacancyParsed / 100)) : null,
        waltMonths: floatOrNull(waltMonths),
        rentIndexed,
        rentEscalation,
        rentUpsidePotential: intOrNull(rentUpsidePotential),
        modernizationBacklog: intOrNull(modernizationBacklog),
        gegCompliant: gegCompliant === "yes" ? true : gegCompliant === "no" ? false : null,
        commissionRate: commissionFree ? null : floatOrNull(commissionRate),
        commissionFree,
        features: tagsOrEmpty(features),
        highlights: tagsOrEmpty(highlights),
        anchorTenant: anchorTenant.trim() || null,
        tenantCount: intOrNull(tenantCount),
        tenantSectors: tagsOrEmpty(tenantSectors)
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
      // Weiterleitung in Edit-Modus, damit Marco direkt Bilder hochladen kann.
      router.push(`/listings/${json.id}/edit`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Eckdaten */}
      <FieldGroup
        title="Eckdaten"
        hint="Pflichtfelder: Titel, Asset-Typ, Stadt, Preis, Fläche. Alles andere optional, aber je mehr ausgefüllt, desto besser passt das Inserat zu Investor-Profilen."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Titel *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Saniertes 12-Einheiten-MFH Berlin-Kreuzberg"
            />
          </div>
          <div>
            <Label>Asset-Typ *</Label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value as AssetTypeT)}
              className={selectCls}
            >
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Stadt *</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="z. B. Berlin" />
          </div>
          <div>
            <Label>Stadtteil (optional)</Label>
            <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="z. B. Kreuzberg" />
          </div>
          <div>
            <Label>Angebotspreis (EUR) *</Label>
            <Input inputMode="numeric" value={askingPrice} onChange={(e) => setAskingPrice(e.target.value)} placeholder="z. B. 4500000" />
          </div>
          <div>
            <Label>Gesamtfläche (m²) *</Label>
            <Input inputMode="decimal" value={totalArea} onChange={(e) => setTotalArea(e.target.value)} placeholder="z. B. 720" />
          </div>
          <div>
            <Label>Gesamt-Sollmiete (EUR/Monat, optional)</Label>
            <Input inputMode="numeric" value={totalRent} onChange={(e) => setTotalRent(e.target.value)} placeholder="z. B. 18500" />
          </div>
        </div>

        <div className="mt-3">
          <Label>Beschreibung (optional jetzt — kannst du später ergänzen)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Lage, Zustand, Mieterstruktur, Modernisierungspotenzial…"
            className="min-h-[120px]"
          />
        </div>
      </FieldGroup>

      {/* Bausubstanz */}
      <FieldGroup title="Bausubstanz" hint="Baujahr, Sanierung, Zustand, Flächen.">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Baujahr</Label>
            <Input inputMode="numeric" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} placeholder="z. B. 1908" />
          </div>
          <div>
            <Label>Letzte Sanierung (Jahr)</Label>
            <Input inputMode="numeric" value={lastRenovation} onChange={(e) => setLastRenovation(e.target.value)} placeholder="z. B. 2019" />
          </div>
          <div>
            <Label>Zustand</Label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as BuildingConditionT | "")}
              className={selectCls}
            >
              <option value="">— bitte wählen —</option>
              {BUILDING_CONDITIONS.map((c) => (
                <option key={c} value={c}>{BUILDING_CONDITION_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Wohnfläche (m²)</Label>
            <Input inputMode="decimal" value={livingArea} onChange={(e) => setLivingArea(e.target.value)} placeholder="z. B. 920" />
          </div>
          <div>
            <Label>Gewerbefläche (m²)</Label>
            <Input inputMode="decimal" value={commercialArea} onChange={(e) => setCommercialArea(e.target.value)} placeholder="z. B. 120" />
          </div>
          <div>
            <Label>Grundstück (m²)</Label>
            <Input inputMode="decimal" value={landArea} onChange={(e) => setLandArea(e.target.value)} placeholder="z. B. 410" />
          </div>
          <div>
            <Label>Etagen</Label>
            <Input inputMode="numeric" value={floors} onChange={(e) => setFloors(e.target.value)} placeholder="z. B. 5" />
          </div>
          <div>
            <Label>Modernisierungsstau (EUR)</Label>
            <Input inputMode="numeric" value={modernizationBacklog} onChange={(e) => setModernizationBacklog(e.target.value)} placeholder="0 wenn keiner" />
          </div>
          <div>
            <Label>GEG-Konformität</Label>
            <select
              value={gegCompliant}
              onChange={(e) => setGegCompliant(e.target.value as "" | "yes" | "no")}
              className={selectCls}
            >
              <option value="">— bitte wählen —</option>
              <option value="yes">Ja, erfüllt</option>
              <option value="no">Nein, Sanierungspflicht</option>
            </select>
          </div>
        </div>
      </FieldGroup>

      {/* Einheiten + Energie */}
      <FieldGroup title="Einheiten & Energie" hint="Anzahl Wohn-/Gewerbeeinheiten, Energieausweis, Heizung.">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Wohneinheiten (WE)</Label>
            <Input inputMode="numeric" value={residentialUnits} onChange={(e) => setResidentialUnits(e.target.value)} placeholder="z. B. 12" />
          </div>
          <div>
            <Label>Gewerbeeinheiten (GE)</Label>
            <Input inputMode="numeric" value={commercialUnits} onChange={(e) => setCommercialUnits(e.target.value)} placeholder="z. B. 1" />
          </div>
          <div />
          <div>
            <Label>Energieklasse</Label>
            <select
              value={energyClass}
              onChange={(e) => setEnergyClass(e.target.value as EnergyClassT | "")}
              className={selectCls}
            >
              <option value="">—</option>
              {ENERGY_CLASSES.map((c) => (
                <option key={c} value={c}>{ENERGY_CLASS_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Endenergie (kWh/m²a)</Label>
            <Input inputMode="decimal" value={energyConsumption} onChange={(e) => setEnergyConsumption(e.target.value)} placeholder="z. B. 78" />
          </div>
          <div>
            <Label>Energieträger</Label>
            <select
              value={energyCarrier}
              onChange={(e) => setEnergyCarrier(e.target.value as EnergyCarrierT | "")}
              className={selectCls}
            >
              <option value="">—</option>
              {ENERGY_CARRIERS.map((c) => (
                <option key={c} value={c}>{ENERGY_CARRIER_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <Label>Heizungstechnik (freier Text)</Label>
            <Input value={heatingType} onChange={(e) => setHeatingType(e.target.value)} placeholder="z. B. Zentralheizung mit Solar-Unterstützung" />
          </div>
        </div>
      </FieldGroup>

      {/* Vermietung */}
      <FieldGroup
        title="Vermietung (Cashflow-Story)"
        hint="Investor-Sicht: Was Privatkäufer-Portale nicht zeigen — Soll vs. Ist, WALT, Mietsteigerungspotenzial."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Istmiete / Monat (EUR)</Label>
            <Input inputMode="numeric" value={actualRent} onChange={(e) => setActualRent(e.target.value)} placeholder="tatsächlich kassiert" />
          </div>
          <div>
            <Label>Leerstand (%)</Label>
            <Input inputMode="decimal" value={vacancyRate} onChange={(e) => setVacancyRate(e.target.value)} placeholder="z. B. 4" />
          </div>
          <div>
            <Label>WALT (Restmietdauer in Monaten)</Label>
            <Input inputMode="decimal" value={waltMonths} onChange={(e) => setWaltMonths(e.target.value)} placeholder="z. B. 38" />
          </div>
          <div>
            <Label>Mietsteigerungspotenzial (EUR/Mon.)</Label>
            <Input inputMode="numeric" value={rentUpsidePotential} onChange={(e) => setRentUpsidePotential(e.target.value)} placeholder="vs. Mietspiegel" />
          </div>
          <div className="md:col-span-2 grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={rentIndexed}
                onChange={(e) => setRentIndexed(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 bg-white text-indigo-600 focus:ring-indigo-500"
              />
              Indexmiete
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={rentEscalation}
                onChange={(e) => setRentEscalation(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 bg-white text-indigo-600 focus:ring-indigo-500"
              />
              Staffelmiete
            </label>
          </div>
        </div>
      </FieldGroup>

      {/* Mieter-Mix */}
      <FieldGroup title="Mieter-Mix" hint="Vor allem bei Gewerbe/Mischnutzung: Anchor-Tenant, Anzahl Verträge, Branchen.">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Anzahl Mietverträge</Label>
            <Input inputMode="numeric" value={tenantCount} onChange={(e) => setTenantCount(e.target.value)} placeholder="z. B. 8" />
          </div>
          <div className="md:col-span-2">
            <Label>Anchor-Tenant (Hauptmieter)</Label>
            <Input value={anchorTenant} onChange={(e) => setAnchorTenant(e.target.value)} placeholder="z. B. REWE Markt GmbH" />
          </div>
          <div className="md:col-span-3">
            <Label>Branchen (kommagetrennt)</Label>
            <Input value={tenantSectors} onChange={(e) => setTenantSectors(e.target.value)} placeholder="z. B. Einzelhandel, Gastronomie, Büro" />
          </div>
        </div>
      </FieldGroup>

      {/* Provision + Tags */}
      <FieldGroup title="Provision & Tags">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={commissionFree}
              onChange={(e) => setCommissionFree(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 bg-white text-indigo-600 focus:ring-indigo-500"
            />
            Provisionsfrei
          </label>
          <div className="md:col-span-2">
            <Label>Käuferprovision (%)</Label>
            <Input
              inputMode="decimal"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              placeholder="z. B. 3.57"
              disabled={commissionFree}
            />
          </div>
          <div className="md:col-span-3">
            <Label>Ausstattung (kommagetrennt)</Label>
            <Input value={features} onChange={(e) => setFeatures(e.target.value)} placeholder="Aufzug, Keller, Stellplatz, Balkon, Garten" />
          </div>
          <div className="md:col-span-3">
            <Label>Highlights (kommagetrennt)</Label>
            <Input value={highlights} onChange={(e) => setHighlights(e.target.value)} placeholder="Vollvermietet, Off-Market, Renditestark, Indexmiete" />
            <div className="mt-1 text-xs text-zinc-500">
              Erscheinen als Pills auf Karten und in der Detail-Ansicht. „Off-Market" und „Vollvermietet" rendern als prominente Badges.
            </div>
          </div>
        </div>
      </FieldGroup>

      {/* Hinweis: Bilder kommen im Edit */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
        <strong>Bilder & Sichtbarkeit</strong> kommen direkt nach dem Anlegen — du wirst automatisch ins Bearbeiten-Fenster weitergeleitet.
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

/* ---------- Helpers ---------- */

function FieldGroup({
  title,
  hint,
  children
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <legend className="px-2 text-sm font-semibold text-zinc-900">{title}</legend>
      {hint ? <p className="mb-3 text-xs text-zinc-500">{hint}</p> : null}
      {children}
    </fieldset>
  );
}

const selectCls =
  "h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none";
