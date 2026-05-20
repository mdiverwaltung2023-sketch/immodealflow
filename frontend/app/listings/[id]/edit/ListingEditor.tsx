"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { useApiFetch } from "@/lib/client-fetch";
import { uploadImageToBlob } from "@/lib/upload-image";
import {
  ASSET_TYPE_LABELS,
  AssetTypeEnum,
  ANONYMIZATION_LABELS,
  AnonymizationLevelEnum,
  LISTING_STATUS_LABELS,
  LISTING_STATUS_ORDER,
  BUILDING_CONDITION_LABELS,
  BuildingConditionEnum,
  ENERGY_CLASS_LABELS,
  EnergyClassEnum,
  ENERGY_CARRIER_LABELS,
  EnergyCarrierEnum,
  type AnonymizationLevelT,
  type AssetTypeT,
  type BuildingConditionT,
  type EnergyCarrierT,
  type EnergyClassT,
  type ListingImageT,
  type ListingStatusT,
  type ListingT
} from "@/lib/api";

const ASSET_TYPES = AssetTypeEnum.options;
const ANON_LEVELS = AnonymizationLevelEnum.options;
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

export function ListingEditor({ initial }: { initial: ListingT }) {
  const router = useRouter();
  const apiFetch = useApiFetch();

  const [title, setTitle] = useState(initial.title);
  const [propertyType, setPropertyType] = useState<AssetTypeT>(initial.propertyType);
  const [askingPrice, setAskingPrice] = useState(String(initial.askingPrice));
  const [totalArea, setTotalArea] = useState(String(initial.totalArea));
  const [totalRent, setTotalRent] = useState(initial.totalRent != null ? String(initial.totalRent) : "");
  const [city, setCity] = useState(initial.city);
  const [postalCode, setPostalCode] = useState(initial.postalCode ?? "");
  const [district, setDistrict] = useState(initial.district ?? "");
  const [fullAddress, setFullAddress] = useState(initial.fullAddress ?? "");
  const [description, setDescription] = useState(initial.description);
  const [anon, setAnon] = useState<AnonymizationLevelT>(initial.anonymizationLevel);
  const [status, setStatus] = useState<ListingStatusT>(initial.status);
  const [images, setImages] = useState<ListingImageT[]>(initial.images);

  // --- v2-Felder ---
  const [yearBuilt, setYearBuilt] = useState(initial.yearBuilt != null ? String(initial.yearBuilt) : "");
  const [lastRenovation, setLastRenovation] = useState(initial.lastRenovation != null ? String(initial.lastRenovation) : "");
  const [condition, setCondition] = useState<BuildingConditionT | "">(initial.condition ?? "");
  const [livingArea, setLivingArea] = useState(initial.livingArea != null ? String(initial.livingArea) : "");
  const [commercialArea, setCommercialArea] = useState(initial.commercialArea != null ? String(initial.commercialArea) : "");
  const [landArea, setLandArea] = useState(initial.landArea != null ? String(initial.landArea) : "");
  const [floors, setFloors] = useState(initial.floors != null ? String(initial.floors) : "");
  const [residentialUnits, setResidentialUnits] = useState(initial.residentialUnits != null ? String(initial.residentialUnits) : "");
  const [commercialUnits, setCommercialUnits] = useState(initial.commercialUnits != null ? String(initial.commercialUnits) : "");
  const [energyClass, setEnergyClass] = useState<EnergyClassT | "">(initial.energyClass ?? "");
  const [energyConsumption, setEnergyConsumption] = useState(initial.energyConsumption != null ? String(initial.energyConsumption) : "");
  const [energyCarrier, setEnergyCarrier] = useState<EnergyCarrierT | "">(initial.energyCarrier ?? "");
  const [heatingType, setHeatingType] = useState(initial.heatingType ?? "");
  const [actualRent, setActualRent] = useState(initial.actualRent != null ? String(initial.actualRent) : "");
  const [vacancyRate, setVacancyRate] = useState(initial.vacancyRate != null ? String(initial.vacancyRate * 100) : "");
  const [waltMonths, setWaltMonths] = useState(initial.waltMonths != null ? String(initial.waltMonths) : "");
  const [rentIndexed, setRentIndexed] = useState<boolean>(initial.rentIndexed === true);
  const [rentEscalation, setRentEscalation] = useState<boolean>(initial.rentEscalation === true);
  const [rentUpsidePotential, setRentUpsidePotential] = useState(initial.rentUpsidePotential != null ? String(initial.rentUpsidePotential) : "");
  const [modernizationBacklog, setModernizationBacklog] = useState(initial.modernizationBacklog != null ? String(initial.modernizationBacklog) : "");
  const [gegCompliant, setGegCompliant] = useState<"" | "yes" | "no">(
    initial.gegCompliant === true ? "yes" : initial.gegCompliant === false ? "no" : ""
  );
  const [commissionRate, setCommissionRate] = useState(initial.commissionRate != null ? String(initial.commissionRate) : "");
  const [commissionFree, setCommissionFree] = useState<boolean>(initial.commissionFree === true);
  const [features, setFeatures] = useState((initial.features ?? []).join(", "));
  const [highlights, setHighlights] = useState((initial.highlights ?? []).join(", "));
  const [anchorTenant, setAnchorTenant] = useState(initial.anchorTenant ?? "");
  const [tenantCount, setTenantCount] = useState(initial.tenantCount != null ? String(initial.tenantCount) : "");
  const [tenantSectors, setTenantSectors] = useState((initial.tenantSectors ?? []).join(", "));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<{ message: string; upgradeTo: string } | null>(null);
  // Doppel-Submit-Sperre (synchron, im Gegensatz zu busy/setBusy).
  const savingRef = useRef(false);

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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setError(null);
    setSaved(null);
    setPaywall(null);
    setBusy(true);
    try {
      const vacancyParsed = floatOrNull(vacancyRate);
      const body = {
        title: title.trim(),
        description: description,
        propertyType,
        askingPrice: intInput(askingPrice),
        totalArea: floatInput(totalArea),
        totalRent: totalRent ? intInput(totalRent) : null,
        city: city.trim(),
        postalCode: postalCode.trim() || null,
        district: district.trim() || null,
        fullAddress: fullAddress.trim() || null,
        anonymizationLevel: anon,
        status,

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
      const res = await apiFetch(`/me/listings/${initial.id}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      // Pay-Wall: 402 mit strukturiertem paywall-Body (Listing-Limit erreicht)
      if (res.status === 402) {
        const data = (await res.json().catch(() => null)) as {
          paywall?: { message: string; upgradeTo: string };
        } | null;
        if (data?.paywall) {
          setPaywall(data.paywall);
          return;
        }
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Speichern fehlgeschlagen (${res.status}) ${txt.slice(0, 200)}`);
      }
      setSaved("Gespeichert ✓");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
      savingRef.current = false;
    }
  }

  async function deleteListing() {
    if (!confirm("Listing samt Bildern unwiderruflich löschen?")) return;
    const res = await apiFetch(`/me/listings/${initial.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Löschen fehlgeschlagen");
      return;
    }
    router.push("/listings");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Titel</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
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
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <Label>PLZ (optional)</Label>
            <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="z. B. 10115" />
          </div>
          <div>
            <Label>Stadtteil (optional)</Label>
            <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="z. B. Mitte" />
          </div>
          <div>
            <Label>Vollständige Adresse (intern, optional)</Label>
            <Input value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} placeholder="z. B. Musterstraße 12" />
          </div>
          <div>
            <Label>Angebotspreis (EUR)</Label>
            <Input inputMode="numeric" value={askingPrice} onChange={(e) => setAskingPrice(e.target.value)} />
          </div>
          <div>
            <Label>Gesamtfläche (m²)</Label>
            <Input inputMode="decimal" value={totalArea} onChange={(e) => setTotalArea(e.target.value)} />
          </div>
          <div>
            <Label>Gesamt-Sollmiete (EUR/Monat, optional)</Label>
            <Input inputMode="numeric" value={totalRent} onChange={(e) => setTotalRent(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Beschreibung</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Lage, Zustand, Mieterstruktur, Modernisierungspotenzial…"
            className="min-h-[180px]"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Anonymisierung im Marketplace</Label>
            <div className="flex flex-col gap-2">
              {ANON_LEVELS.map((l) => (
                <label
                  key={l}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                    anon === l ? "border-indigo-500 bg-indigo-50" : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="anon"
                    checked={anon === l}
                    onChange={() => setAnon(l)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-semibold text-zinc-900">{ANONYMIZATION_LABELS[l]}</div>
                    <div className="text-xs text-zinc-500">
                      {l === "FULL_ADDRESS" && "Investor sieht Straße + Hausnummer ab Aktivierung."}
                      {l === "DISTRICT_ONLY" && "Investor sieht nur Stadt + Stadtteil. Vollständige Adresse erst nach Anfrage-Annahme (Phase D)."}
                      {l === "CITY_ONLY" && "Investor sieht nur die Stadt — maximale Anonymität, gut für sensible Bestände."}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ListingStatusT)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {LISTING_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{LISTING_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <div className="mt-2 text-xs text-zinc-500">
              Nur <span className="font-semibold text-zinc-700">Aktiv</span> erscheint im öffentlichen Marketplace.
            </div>
          </div>
        </div>

        {/* --- v2: Bausubstanz --- */}
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
                className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">— bitte wählen —</option>
                <option value="yes">Ja, erfüllt</option>
                <option value="no">Nein, Sanierungspflicht</option>
              </select>
            </div>
          </div>
        </FieldGroup>

        {/* --- v2: Einheiten + Energie --- */}
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
                className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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

        {/* --- v2: Vermietung (USP) --- */}
        <FieldGroup
          title="Vermietung (Cashflow-Story)"
          hint="Investor-Sicht: Was Privatkäufer-Portale nicht zeigen — die Lücke zwischen Soll und Ist, WALT, Mietsteigerungspotenzial."
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

        {/* --- v2: Tenant-Mix (für Gewerbe/Mischnutzung) --- */}
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

        {/* --- v2: Provision + Tags --- */}
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
                Erscheinen als Pills auf Karten und in der Detail-Ansicht. Spezielle Erkennung:
                „Off-Market" und „Vollvermietet" rendern als prominente Badges.
              </div>
            </div>
          </div>
        </FieldGroup>

        {paywall ? (
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2.5">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-amber-900">
                  Listing-Limit erreicht
                </div>
                <div className="mt-1 text-xs text-amber-800">{paywall.message}</div>
                <a
                  href="/pricing"
                  className="mt-3 inline-block rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                >
                  Verkäufer Pro freischalten →
                </a>
                <div className="mt-2 text-[11px] text-amber-700">
                  Tipp: Du kannst dein Listing als Entwurf speichern, indem du den
                  Status oben auf <span className="font-semibold">Entwurf</span> stellst.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? "Speichern…" : "Speichern"}
          </Button>
          <Button type="button" variant="ghost" onClick={deleteListing} disabled={busy}>
            Löschen
          </Button>
          {saved ? <span className="text-xs text-emerald-700">{saved}</span> : null}
          {error ? <span className="text-xs text-rose-600">{error}</span> : null}
        </div>
      </form>

      <ImageUploadSection
        listingId={initial.id}
        images={images}
        onChange={setImages}
      />
    </div>
  );
}

/**
 * Visuelle Trennung für Form-Sektionen.
 */
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

/**
 * Pro-File-Upload-State. Wird in einer Liste unter der Drop-Zone angezeigt.
 * Erfolgreiche Uploads werden nach 4 s automatisch entfernt; Fehler
 * bleiben stehen, bis Marco sie wegklickt.
 */
type UploadItem = {
  id: string;
  name: string;
  status: "compressing" | "uploading" | "registering" | "done" | "error";
  percent: number;
  error?: string;
  sizeOriginal: number;
  sizeFinal?: number;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function ImageUploadSection({
  listingId,
  images,
  onChange
}: {
  listingId: string;
  images: ListingImageT[];
  onChange: React.Dispatch<React.SetStateAction<ListingImageT[]>>;
}) {
  const apiFetch = useApiFetch();
  const { user, isLoaded } = useUser();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patchItem(id: string, patch: Partial<UploadItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function uploadOne(file: File, item: UploadItem) {
    if (!user) return;
    try {
      patchItem(item.id, { status: "uploading", percent: 0 });
      const result = await uploadImageToBlob({
        file,
        userId: user.id,
        onProgress: (pct) => patchItem(item.id, { percent: pct })
      });

      patchItem(item.id, {
        status: "registering",
        percent: 100,
        sizeFinal: result.finalSize
      });

      const res = await apiFetch(`/me/listings/${listingId}/images`, {
        method: "POST",
        body: JSON.stringify({ url: result.url, alt: file.name })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(
          `Registrierung fehlgeschlagen (${res.status}) ${txt.slice(0, 200)}`
        );
      }
      const img = (await res.json()) as ListingImageT;
      // Funktional-Form: schliesst stale-closure-Bug bei parallelen Uploads aus.
      onChange((prev) => [...prev, img]);
      patchItem(item.id, { status: "done" });
      // Erfolgreiche Items nach 4 s aus der Liste raus
      setTimeout(() => {
        setItems((prev) => prev.filter((it) => it.id !== item.id));
      }, 4000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload-Fehler";
      patchItem(item.id, { status: "error", error: msg });
    }
  }

  async function startUploads(files: FileList | File[] | null) {
    if (!files) return;
    setError(null);
    if (!isLoaded) return;
    if (!user) {
      setError("Bitte einloggen, dann erneut versuchen.");
      return;
    }
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const rejected = Array.from(files).length - arr.length;
    if (rejected > 0) {
      setError(`${rejected} Datei(en) ueberprungen — nur Bilder erlaubt.`);
    }
    if (arr.length === 0) return;

    const newItems: UploadItem[] = arr.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: f.name,
      status: "compressing",
      percent: 0,
      sizeOriginal: f.size
    }));
    setItems((prev) => [...prev, ...newItems]);

    // Parallel hochladen — Browser parallelisiert HTTP/2-Verbindungen
    // ohnehin auf max ~6 pro Origin, das reicht fuer typische 3-10
    // Bilder pro Inserat.
    await Promise.all(arr.map((f, i) => uploadOne(f, newItems[i])));

    // File-Input zuruecksetzen, damit dieselbe Datei nochmal gewaehlt
    // werden koennte (Browser ignoriert sonst onChange).
    if (fileInput.current) fileInput.current.value = "";
  }

  async function deleteImage(imageId: string) {
    if (!confirm("Bild loeschen?")) return;
    const res = await apiFetch(`/me/listings/${listingId}/images/${imageId}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      alert("Loeschen fehlgeschlagen");
      return;
    }
    onChange((prev) => prev.filter((i) => i.id !== imageId));
  }

  function dismissError(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  // --- Drag-and-Drop Reihenfolge (Kanban-Style) ---
  //
  // Sensoren mit Activation-Constraint, damit ein normaler Klick auf
  // den Loeschen-Button nicht versehentlich einen Drag startet:
  // - Pointer (Maus/Stylus): Drag startet erst nach 8 px Bewegung
  // - Touch: Drag startet nach 200 ms Druecken + max 5 px Toleranz —
  //   das ist das klassische "Press-and-Hold-and-Drag" Kanban-Pattern
  // - Keyboard: Pfeiltasten + Space fuer Accessibility
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((i) => i.id === active.id);
    const newIndex = images.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(images, oldIndex, newIndex);

    // Optimistic UI — Marco sieht die neue Reihenfolge sofort
    onChange(() => reordered);

    // Backend nachziehen
    try {
      const res = await apiFetch(`/me/listings/${listingId}/images/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ orderedIds: reordered.map((i) => i.id) })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(
          `Reihenfolge speichern fehlgeschlagen (${res.status}) ${txt.slice(0, 200)}`
        );
      }
      // Backend liefert den finalen Stand mit aktualisierten sortOrder-Werten
      const updated = (await res.json()) as ListingImageT[];
      onChange(() => updated);
    } catch (e) {
      // Rollback bei Fehler
      onChange(() => images);
      setError(e instanceof Error ? e.message : "Reihenfolge nicht gespeichert");
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div>
        <div className="text-sm font-semibold text-zinc-900">
          Bilder ({images.length})
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          Mehrere Bilder gleichzeitig moeglich. Werden client-seitig auf
          max. 2560 px komprimiert (JPEG q=0.85) und direkt zu Vercel Blob
          hochgeladen — kein 4-MB-Limit mehr.
        </div>
      </div>

      {/* Drop-Zone */}
      <label
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          startUploads(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition ${
          dragOver
            ? "border-indigo-500 bg-indigo-50"
            : "border-zinc-300 bg-white hover:border-zinc-400"
        }`}
      >
        <svg
          className="h-8 w-8 text-zinc-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className="text-sm font-medium text-zinc-700">
          Bilder hier ablegen oder{" "}
          <span className="text-indigo-600 underline">durchsuchen</span>
        </div>
        <div className="text-xs text-zinc-500">
          JPG, PNG, WebP, AVIF, GIF — mehrere Dateien gleichzeitig
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => startUploads(e.target.files)}
          className="sr-only"
        />
      </label>

      {error ? <div className="text-xs text-rose-600">{error}</div> : null}

      {/* Aktive + abgeschlossene Uploads */}
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="rounded-lg border border-zinc-200 bg-white p-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate font-medium text-zinc-800">
                  {it.name}
                </span>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold ${
                    it.status === "done"
                      ? "bg-emerald-100 text-emerald-800"
                      : it.status === "error"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-indigo-100 text-indigo-800"
                  }`}
                >
                  {it.status === "compressing" && "Komprimiere…"}
                  {it.status === "uploading" && `${it.percent}%`}
                  {it.status === "registering" && "Speichere…"}
                  {it.status === "done" && "Fertig ✓"}
                  {it.status === "error" && "Fehler"}
                </span>
                {it.status === "error" ? (
                  <button
                    type="button"
                    onClick={() => dismissError(it.id)}
                    className="text-rose-600 hover:underline"
                  >
                    schliessen
                  </button>
                ) : null}
              </div>
              {it.status === "uploading" || it.status === "registering" ? (
                <div className="mt-1 h-1 w-full overflow-hidden rounded bg-zinc-100">
                  <div
                    className="h-full bg-indigo-500 transition-all"
                    style={{
                      width: `${it.status === "registering" ? 100 : it.percent}%`
                    }}
                  />
                </div>
              ) : null}
              {it.status === "done" && it.sizeFinal != null ? (
                <div className="mt-1 text-[10px] text-zinc-500">
                  {formatBytes(it.sizeOriginal)} →{" "}
                  {formatBytes(it.sizeFinal)} (
                  {Math.round((1 - it.sizeFinal / it.sizeOriginal) * 100)}%
                  kleiner)
                </div>
              ) : null}
              {it.status === "error" && it.error ? (
                <div className="mt-1 text-[11px] text-rose-700">{it.error}</div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {images.length === 0 ? (
        <div className="text-sm text-zinc-500">Noch keine Bilder.</div>
      ) : (
        <>
          <div className="text-xs text-zinc-500">
            <span className="font-medium text-zinc-700">Tipp:</span> Bilder per
            Drag-and-Drop verschieben — am Desktop klicken und ziehen, am
            Smartphone/Tablet kurz draufdruecken (~0,2 s) und dann ziehen. Das
            erste Bild ist das Cover.
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={images.map((i) => i.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {images.map((img, index) => (
                  <SortableImageCard
                    key={img.id}
                    image={img}
                    isCover={index === 0}
                    onDelete={() => deleteImage(img.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
  );
}

/**
 * Einzelne Bildkachel, die per Drag-and-Drop sortiert werden kann.
 *
 * UX-Details:
 *  - Drag-Listener (attributes + listeners) liegen auf der GANZEN Karte
 *    minus dem Loeschen-Button — damit kann Marco ueberall im Bild
 *    anpacken, aber der Loeschen-Button bleibt klickbar (er macht
 *    stopPropagation).
 *  - Activation-Constraint im Sensor (siehe oben) sorgt dafuer, dass ein
 *    versehentlicher Klick KEIN Drag startet — erst Bewegung oder
 *    Press-and-Hold loest ihn aus.
 *  - Beim Ziehen: leicht ausgeblendet + cursor:grabbing.
 *  - Cover-Badge (links oben) auf dem ersten Bild.
 */
function SortableImageCard({
  image,
  isCover,
  onDelete
}: {
  image: ListingImageT;
  isCover: boolean;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: image.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative touch-none select-none overflow-hidden rounded-lg border bg-white ${
        isDragging
          ? "border-indigo-400 ring-2 ring-indigo-300 cursor-grabbing"
          : "border-zinc-200 cursor-grab hover:border-zinc-300"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.alt ?? ""}
        draggable={false}
        className="pointer-events-none aspect-video w-full object-cover"
      />

      {isCover ? (
        <div className="absolute left-1 top-1 rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
          Cover
        </div>
      ) : null}

      {/* Drag-Handle-Hinweis-Icon, sichtbar im Hover */}
      <div className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
        Ziehen
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute right-1 top-1 rounded-md border border-zinc-200 bg-white/90 px-2 py-1 text-[10px] text-rose-600 opacity-0 transition group-hover:opacity-100 hover:bg-rose-50"
      >
        Loeschen
      </button>
    </div>
  );
}
