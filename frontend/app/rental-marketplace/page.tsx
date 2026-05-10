import Link from "next/link";
import { z } from "zod";
import { RentalMarketplaceListItemSchema, type RentalMarketplaceListItemT } from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const ListSchema = z.array(RentalMarketplaceListItemSchema);

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

type SearchParams = {
  city?: string;
  roomsMin?: string;
  rentMax?: string;
  areaMin?: string;
  furnished?: string;
  petsAllowed?: string;
  barrierFree?: string;
};

function buildQuery(p: SearchParams): string {
  const sp = new URLSearchParams();
  if (p.city) sp.set("city", p.city);
  if (p.roomsMin) sp.set("roomsMin", p.roomsMin);
  if (p.rentMax) sp.set("rentMax", p.rentMax);
  if (p.areaMin) sp.set("areaMin", p.areaMin);
  if (p.furnished === "1") sp.set("furnished", "1");
  if (p.petsAllowed === "1") sp.set("petsAllowed", "1");
  if (p.barrierFree === "1") sp.set("barrierFree", "1");
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function RentalMarketplacePage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  await requireOnboardedUser();

  const query = buildQuery(searchParams);
  const units = await apiGet(`/rental-marketplace${query}`, ListSchema).catch(
    () => [] as RentalMarketplaceListItemT[]
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-zinc-900">Mietbörse</div>
        <div className="mt-1 text-sm text-zinc-500">
          Verfügbare Mietwohnungen aus der gesamten Plattform.
          Adressen werden erst nach Bewerbung &amp; Freigabe durch den Vermieter geteilt.
        </div>
      </div>

      <Card title="Filter">
        <form method="get" className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          <div>
            <label className="block text-[11px] font-medium text-zinc-600">Stadt</label>
            <input
              name="city"
              defaultValue={searchParams.city ?? ""}
              placeholder="z.B. Berlin"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600">
              Min. Zimmer
            </label>
            <input
              name="roomsMin"
              type="number"
              step="0.5"
              min="0"
              defaultValue={searchParams.roomsMin ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600">
              Max. Kaltmiete (€)
            </label>
            <input
              name="rentMax"
              type="number"
              min="0"
              step="50"
              defaultValue={searchParams.rentMax ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600">
              Min. Fläche (m²)
            </label>
            <input
              name="areaMin"
              type="number"
              min="0"
              step="5"
              defaultValue={searchParams.areaMin ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-3 lg:col-span-4 flex flex-wrap items-center gap-4 pt-1">
            <label className="inline-flex items-center gap-2 text-xs text-zinc-700">
              <input
                type="checkbox"
                name="furnished"
                value="1"
                defaultChecked={searchParams.furnished === "1"}
                className="rounded border-zinc-300"
              />
              Möbliert
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-zinc-700">
              <input
                type="checkbox"
                name="petsAllowed"
                value="1"
                defaultChecked={searchParams.petsAllowed === "1"}
                className="rounded border-zinc-300"
              />
              Haustiere erlaubt
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-zinc-700">
              <input
                type="checkbox"
                name="barrierFree"
                value="1"
                defaultChecked={searchParams.barrierFree === "1"}
                className="rounded border-zinc-300"
              />
              Barrierefrei
            </label>

            <div className="ml-auto flex gap-2">
              <Link
                href="/rental-marketplace"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Zurücksetzen
              </Link>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Anwenden
              </button>
            </div>
          </div>
        </form>
      </Card>

      <div className="text-xs text-zinc-500">
        {units.length} {units.length === 1 ? "Treffer" : "Treffer"}
      </div>

      {units.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600">
          Keine Mietobjekte gefunden, die deinen Filtern entsprechen.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {units.map((u) => {
            const cover = u.images?.[0];
            return (
              <Link
                key={u.id}
                href={`/rental-marketplace/${u.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-lg hover:border-zinc-300"
              >
                <div className="relative aspect-[16/9] w-full bg-zinc-100">
                  {cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={cover.url}
                      alt={cover.alt ?? u.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                      Kein Bild
                    </div>
                  )}
                  {u.furnished ? (
                    <span className="absolute left-3 top-3 rounded-md bg-emerald-600/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                      Möbliert
                    </span>
                  ) : null}
                  {u.barrierFree ? (
                    <span className="absolute right-3 top-3 rounded-md bg-sky-600/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                      Barrierefrei
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="text-base font-semibold text-zinc-900 line-clamp-1 group-hover:text-indigo-700">
                    {u.title}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {u.city}
                    {u.district ? ` · ${u.district}` : ""} · {u.rooms} Zi · {u.livingArea} m²
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[10px] text-zinc-600">
                    {u.balcony ? (
                      <span className="rounded-md bg-zinc-100 px-1.5 py-0.5">Balkon</span>
                    ) : null}
                    {u.terrace ? (
                      <span className="rounded-md bg-zinc-100 px-1.5 py-0.5">Terrasse</span>
                    ) : null}
                    {u.garden ? (
                      <span className="rounded-md bg-zinc-100 px-1.5 py-0.5">Garten</span>
                    ) : null}
                    {u.elevator ? (
                      <span className="rounded-md bg-zinc-100 px-1.5 py-0.5">Aufzug</span>
                    ) : null}
                    {u.kitchenIncluded ? (
                      <span className="rounded-md bg-zinc-100 px-1.5 py-0.5">EBK</span>
                    ) : null}
                    {u.petsAllowed ? (
                      <span className="rounded-md bg-zinc-100 px-1.5 py-0.5">Haustiere</span>
                    ) : null}
                  </div>
                  <div className="mt-auto flex flex-wrap items-baseline justify-between gap-2 border-t border-zinc-100 pt-2 text-sm">
                    <span className="font-bold tabular-nums text-zinc-900">
                      {eur(u.rentCold)}{" "}
                      <span className="text-[10px] font-normal text-zinc-500">
                        kalt/Mon.
                      </span>
                    </span>
                    {u.totalRent ? (
                      <span className="text-xs text-zinc-500">
                        warm: {eur(u.totalRent)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
