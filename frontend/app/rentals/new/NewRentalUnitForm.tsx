"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import { Button, Input, Textarea, Label } from "@/components/ui";

export function NewRentalUnitForm() {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [rooms, setRooms] = useState("");
  const [livingArea, setLivingArea] = useState("");
  const [rentCold, setRentCold] = useState("");
  const [utilities, setUtilities] = useState("");
  const [deposit, setDeposit] = useState("");
  const [description, setDescription] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (busy) return;

    const body: Record<string, unknown> = { title: title.trim(), city: city.trim() };
    if (district.trim()) body.district = district.trim();
    if (rooms.trim()) body.rooms = Number(rooms);
    if (livingArea.trim()) body.livingArea = Number(livingArea);
    if (rentCold.trim()) body.rentCold = Math.round(Number(rentCold));
    if (utilities.trim()) body.utilities = Math.round(Number(utilities));
    if (deposit.trim()) body.deposit = Math.round(Number(deposit));
    if (description.trim()) body.description = description.trim();

    if (!Number.isFinite(body.rooms as number) || (body.rooms as number) <= 0) {
      setErr("Bitte gültige Zimmeranzahl angeben.");
      return;
    }
    if (!Number.isFinite(body.livingArea as number) || (body.livingArea as number) <= 0) {
      setErr("Bitte gültige Wohnfläche angeben.");
      return;
    }
    if (!Number.isFinite(body.rentCold as number) || (body.rentCold as number) < 0) {
      setErr("Bitte gültige Kaltmiete angeben.");
      return;
    }

    setBusy(true);
    try {
      const r = await apiFetch("/me/rental-units", {
        method: "POST",
        body: JSON.stringify(body)
      });
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        setErr(j?.error ?? `Fehler ${r.status}`);
        return;
      }
      const created = (await r.json()) as { id: string };
      router.push(`/rentals/${created.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label>Titel</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z. B. Schöne 3-Zi-Wohnung mit Balkon, Berlin Friedrichshain"
          required
          minLength={5}
          maxLength={200}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Stadt</Label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Berlin"
            required
          />
        </div>
        <div>
          <Label>Stadtteil (optional)</Label>
          <Input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="Friedrichshain"
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Zimmer</Label>
          <Input
            type="number"
            min={0.5}
            step={0.5}
            value={rooms}
            onChange={(e) => setRooms(e.target.value)}
            placeholder="3"
            required
          />
        </div>
        <div>
          <Label>Wohnfläche (m²)</Label>
          <Input
            type="number"
            min={1}
            step={1}
            value={livingArea}
            onChange={(e) => setLivingArea(e.target.value)}
            placeholder="78"
            required
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <Label>Kaltmiete (EUR/Monat)</Label>
          <Input
            type="number"
            min={0}
            step={10}
            value={rentCold}
            onChange={(e) => setRentCold(e.target.value)}
            placeholder="850"
            required
          />
        </div>
        <div>
          <Label>Nebenkosten</Label>
          <Input
            type="number"
            min={0}
            step={10}
            value={utilities}
            onChange={(e) => setUtilities(e.target.value)}
            placeholder="180"
          />
        </div>
        <div>
          <Label>Kaution</Label>
          <Input
            type="number"
            min={0}
            step={100}
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            placeholder="2550"
          />
        </div>
      </div>
      <div>
        <Label>Beschreibung (optional)</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Helle Wohnung im 3. OG, Aufzug, Einbauküche, ruhige Lage …"
          className="min-h-[110px]"
        />
      </div>
      {err ? <div className="text-sm text-rose-600">{err}</div> : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {busy ? "Speichere …" : "Anlegen & weiter"}
        </Button>
      </div>
    </form>
  );
}
