import Link from "next/link";
import { z } from "zod";
import {
  ApplicationSentItemSchema,
  APPLICATION_STATUS_LABELS,
  type ApplicationStatusT,
  type ApplicationSentItemT
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const ListSchema = z.array(ApplicationSentItemSchema);

const STATUS_TONES: Record<ApplicationStatusT, string> = {
  NEW: "bg-zinc-100 text-zinc-700 border-zinc-200",
  REVIEWING: "bg-indigo-50 text-indigo-700 border-indigo-200",
  VIEWING: "bg-amber-50 text-amber-800 border-amber-200",
  ACCEPTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  WITHDRAWN: "bg-zinc-50 text-zinc-500 border-zinc-200"
};

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

export default async function MyApplicationsSentPage() {
  await requireOnboardedUser();
  const items = await apiGet("/me/applications-sent", ListSchema).catch(
    () => [] as ApplicationSentItemT[]
  );

  const counts: Record<ApplicationStatusT | "ALL", number> = {
    ALL: items.length,
    NEW: 0,
    REVIEWING: 0,
    VIEWING: 0,
    ACCEPTED: 0,
    REJECTED: 0,
    WITHDRAWN: 0
  };
  items.forEach((i) => counts[i.status]++);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-zinc-900">Meine Bewerbungen</div>
        <div className="mt-1 text-sm text-zinc-500">
          Übersicht über alle deine eingereichten Bewerbungen aus der Mietbörse.
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600">
          Du hast noch keine Bewerbungen abgeschickt. Stöbere durch die{" "}
          <Link
            href="/rental-marketplace"
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            Mietbörse
          </Link>
          , um eine passende Wohnung zu finden.
        </div>
      ) : (
        <>
          <Card title="Status-Übersicht">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatusT[]).map(
                (s) => (
                  <div
                    key={s}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600"
                  >
                    {APPLICATION_STATUS_LABELS[s]}:{" "}
                    <span className="font-semibold text-zinc-900">
                      {counts[s]}
                    </span>
                  </div>
                )
              )}
            </div>
          </Card>

          <div className="grid gap-4">
            {items.map((it) => {
              const cover = it.unit.images?.[0];
              return (
                <Link
                  key={it.id}
                  href={`/rental-marketplace/${it.unit.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md hover:border-zinc-300 sm:flex-row"
                >
                  <div className="relative h-44 w-full shrink-0 bg-zinc-100 sm:h-auto sm:w-56">
                    {cover ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={cover.url}
                        alt={it.unit.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                        Kein Bild
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-zinc-900 line-clamp-1 group-hover:text-indigo-700">
                          {it.unit.title}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {it.unit.city}
                          {it.unit.district ? ` · ${it.unit.district}` : ""} ·{" "}
                          {it.unit.rooms} Zi · {it.unit.livingArea} m² ·{" "}
                          {eur(it.unit.rentCold)} kalt
                        </div>
                      </div>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_TONES[it.status]}`}
                      >
                        {APPLICATION_STATUS_LABELS[it.status]}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-500">
                      Eingereicht am{" "}
                      {new Date(it.createdAt).toLocaleDateString("de-DE")}
                      {it.desiredMoveInDate
                        ? ` · Wunsch-Einzug ${new Date(it.desiredMoveInDate).toLocaleDateString("de-DE")}`
                        : ""}
                    </div>

                    {it.notes ? (
                      <div className="mt-1 line-clamp-2 rounded-md bg-zinc-50 p-2 text-[11px] text-zinc-600">
                        „{it.notes}"
                      </div>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
