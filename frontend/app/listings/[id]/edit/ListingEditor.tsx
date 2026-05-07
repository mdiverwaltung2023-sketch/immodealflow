"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { useApiFetch } from "@/lib/client-fetch";
import {
  ASSET_TYPE_LABELS,
  AssetTypeEnum,
  ANONYMIZATION_LABELS,
  AnonymizationLevelEnum,
  LISTING_STATUS_LABELS,
  LISTING_STATUS_ORDER,
  type AnonymizationLevelT,
  type AssetTypeT,
  type ListingImageT,
  type ListingStatusT,
  type ListingT
} from "@/lib/api";

const ASSET_TYPES = AssetTypeEnum.options;
const ANON_LEVELS = AnonymizationLevelEnum.options;

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

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    setBusy(true);
    try {
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
        status
      };
      const res = await apiFetch(`/me/listings/${initial.id}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      });
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

function ImageUploadSection({
  listingId,
  images,
  onChange
}: {
  listingId: string;
  images: ListingImageT[];
  onChange: (next: ListingImageT[]) => void;
}) {
  const apiFetch = useApiFetch();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      // 1. Upload zu Vercel Blob via Frontend-Route
      const form = new FormData();
      form.append("file", file);
      const up = await fetch("/api/upload-image", { method: "POST", body: form });
      if (!up.ok) {
        const j = await up.json().catch(() => ({}));
        throw new Error(j.error ?? `Upload fehlgeschlagen (${up.status})`);
      }
      const { url } = (await up.json()) as { url: string };

      // 2. URL ans Backend hängen
      const res = await apiFetch(`/me/listings/${listingId}/images`, {
        method: "POST",
        body: JSON.stringify({ url, alt: file.name })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Bild-Registrierung fehlgeschlagen (${res.status}) ${txt.slice(0, 200)}`);
      }
      const img = (await res.json()) as ListingImageT;
      onChange([...images, img]);
      setInfo(`Hochgeladen: ${file.name}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function deleteImage(imageId: string) {
    if (!confirm("Bild löschen?")) return;
    const res = await apiFetch(`/me/listings/${listingId}/images/${imageId}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Löschen fehlgeschlagen");
      return;
    }
    onChange(images.filter((i) => i.id !== imageId));
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Bilder ({images.length})</div>
          <div className="mt-1 text-xs text-zinc-500">
            Bilder bis 4 MB. Werden auf Vercel Blob gespeichert.
            Falls Vercel Blob noch nicht aktiviert ist, kommt eine Hinweis-Meldung beim Upload.
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFile(f);
          }}
          disabled={busy}
          className="text-xs text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-700"
        />
      </div>

      {error ? <div className="text-xs text-rose-600">{error}</div> : null}
      {info ? <div className="text-xs text-emerald-700">{info}</div> : null}

      {images.length === 0 ? (
        <div className="text-sm text-zinc-500">Noch keine Bilder.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt ?? ""}
                className="aspect-video w-full object-cover"
              />
              <button
                type="button"
                onClick={() => deleteImage(img.id)}
                className="absolute right-1 top-1 rounded-md bg-white/90 border border-zinc-200 px-2 py-1 text-[10px] text-rose-600 opacity-0 transition group-hover:opacity-100 hover:bg-rose-50"
              >
                Löschen
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
