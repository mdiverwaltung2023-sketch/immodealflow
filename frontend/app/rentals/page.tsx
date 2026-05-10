import Link from "next/link";
import { z } from "zod";
import {
  RentalUnitListItemSchema,
  RENTAL_STATUS_LABELS,
  RENTAL_STATUS_ORDER,
  type RentalStatusT,
  type RentalUnitListItemT
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const ListSchema = z.array(RentalUnitListItemSchema);

const STATUS_TONES: Record<RentalStatusT, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 border-zinc-200",
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RESERVED: "bg-amber-50 text-amber-800 border-amber-200",
  RENTED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  ARCHIVED: "bg-zinc-50 text-zinc-500 border-zinc-200"
};

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

export default async function RentalsListPage() {
  await requireOnboardedUser();
  const units = await apiGet("/me/rental-units", ListSchema).catch(
    () => [] as RentalUnitListItemT[]
  );

  const counts: Record<RentalStatusT | "ALL", number> = {
    ALL: units.length,
    DRAFT: 0,
    AVAILABLE: 0,
    RESERVED: 0,
    RENTED: 0,
    ARCHIVED: 0
  };
  units.forEach((u) => counts[u.status]++);

  const STATUS_RANK: Record<RentalStatusT, number> = {
    AVAILABLE: 0,
    RESERVED: 1,
    DRAFT: 2,
    RENTED: 3,
    ARCHIVED: 4
  };
  const sorted = [...units].sort((a, b) => {
    const r = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (r !== 0) return r;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-zinc-900">Vermietung</div>
          <div className="mt-1 text-sm text-zinc-500">
            Mietobjekte verwalten, Bewerber organisieren, KI-gestützt einschätzen.
          </div>
        </div>
        <Link
          href="/rentals/new"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Mietobjekt anlegen
        </Link>
      </div>

      <Card title="Status-Übersicht">
        <div className="flex flex-wrap gap-2">
          {RENTAL_STATUS_ORDER.map((s) => (
            <div
              key={s}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600"
            >
              {RENTAL_STATUS_LABELS[s]}:{" "}
              <span className="font-semibold text-zinc-900">{counts[s]}</span>
            </div>
          ))}
        </div>
      </Card>

      {units.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600">
          Noch keine Mietobjekte. Lege über{" "}
          <Link
            href="/rentals/new"
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            „Mietobjekt anlegen"
          </Link>{" "}
          deine erste Wohnung an.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((u) => {
            const cover = u.images?.[0];
            return (
              <Link
                key={u.id}
                href={`/rentals/${u.id}`}
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
                  <span
                    className={`absolute left-3 top-3 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm ${STATUS_TONES[u.status]}`}
                  >
                    {RENTAL_STATUS_LABELS[u.status]}
                  </span>
                  {u._count && u._count.applications > 0 ? (
                    <span className="absolute right-3 top-3 rounded-md bg-zinc-900/80 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
                      {u._count.applications} Bewerber
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
                  <div className="mt-auto flex flex-wrap items-baseline justify-between gap-2 border-t border-zinc-100 pt-2 text-sm">
                    <span className="font-bold tabular-nums text-zinc-900">
                      {eur(u.rentCold)}{" "}
                      <span className="text-[10px] font-normal text-zinc-500">kalt/Mon.</span>
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
