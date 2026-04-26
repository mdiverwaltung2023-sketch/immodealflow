import Link from "next/link";
import { apiGet, PropertySchema } from "@/lib/api";
import { Card } from "@/components/ui";
import { PropertyActions } from "./PropertyActions";
import { z } from "zod";

const PropertiesSchema = z.array(PropertySchema);

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

export default async function DashboardPage() {
  const properties = await apiGet("/properties", PropertiesSchema);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Dashboard</div>
          <div className="mt-1 text-sm text-zinc-400">
            Properties anlegen, analysieren und Angebot generieren.
          </div>
        </div>
        <Link
          href="/new"
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600"
        >
          Neues Objekt
        </Link>
      </div>

      <Card title={`Properties (${properties.length})`}>
        {properties.length === 0 ? (
          <div className="text-sm text-zinc-400">
            Noch keine Properties. Lege über <Link className="underline" href="/new">/new</Link> ein Objekt an.
          </div>
        ) : (
          <div className="divide-y divide-zinc-900">
            {properties.map((p) => (
              <div key={p.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <Link href={`/property/${p.id}`} className="text-sm font-semibold text-white hover:underline">
                    {p.title}
                  </Link>
                  <div className="mt-1 text-xs text-zinc-400">
                    {p.location} • {p.size} m² • Preis {eur(p.price)} • Miete {eur(p.rent)}/Monat
                  </div>
                </div>
                <PropertyActions id={p.id} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

