"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Phase L10 — Hero-Suche für die Mieter-Landing-Page.
 *
 * Klickt der Nutzer "Wohnungen finden", landet er auf /sign-up mit
 * den Suchparametern als Query — nach dem Sign-up wird er auf
 * /rental-marketplace mit den vorbefüllten Filtern weitergeleitet.
 *
 * Damit ist die Eingabe nicht "umsonst" — der Mieter sieht nach dem
 * Sign-up sofort die zu seinen Kriterien passenden Wohnungen.
 */
export function HeroTenantSearch() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [rentMax, setRentMax] = useState("");
  const [roomsMin, setRoomsMin] = useState("");
  const [furnished, setFurnished] = useState(false);
  const [petsAllowed, setPetsAllowed] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (city.trim()) sp.set("city", city.trim());
    if (rentMax.trim()) sp.set("rentMax", rentMax.trim());
    if (roomsMin.trim()) sp.set("roomsMin", roomsMin.trim());
    if (furnished) sp.set("furnished", "1");
    if (petsAllowed) sp.set("petsAllowed", "1");
    const target = `/rental-marketplace${sp.toString() ? `?${sp.toString()}` : ""}`;
    router.push(`/sign-up?redirect_url=${encodeURIComponent(target)}`);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/95 p-6 shadow-xl backdrop-blur">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
        Wohnung finden
      </div>
      <div className="mt-1 text-base font-semibold text-zinc-900">
        Wo möchtest du wohnen?
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Filter setzen — nach dem Sign-up zeigen wir dir direkt die passenden Wohnungen.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-zinc-600">Stadt</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="z.B. Berlin"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600">
              Max. Kaltmiete (€)
            </label>
            <input
              type="number"
              min={0}
              step={50}
              value={rentMax}
              onChange={(e) => setRentMax(e.target.value)}
              placeholder="1200"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600">
              Min. Zimmer
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={roomsMin}
              onChange={(e) => setRoomsMin(e.target.value)}
              placeholder="2"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-zinc-700">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={furnished}
              onChange={(e) => setFurnished(e.target.checked)}
              className="rounded border-zinc-300"
            />
            <span>Möbliert</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={petsAllowed}
              onChange={(e) => setPetsAllowed(e.target.checked)}
              className="rounded border-zinc-300"
            />
            <span>Haustiere erlaubt</span>
          </label>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700"
        >
          Wohnungen finden →
        </button>

        <div className="text-center text-[10px] text-zinc-500">
          Kostenlos registrieren · Bewerben in einem Klick · AGG-konform
        </div>
      </form>
    </div>
  );
}
