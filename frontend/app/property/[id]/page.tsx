import Link from "next/link";
import { apiGet, PropertyDetailSchema } from "@/lib/api";
import { Card, Stat } from "@/components/ui";

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

export default async function PropertyPage({ params }: { params: { id: string } }) {
  const p = await apiGet(`/properties/${params.id}`, PropertyDetailSchema);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xl font-semibold">{p.title}</div>
          <div className="mt-1 text-sm text-zinc-400">
            {p.location} • {p.size} m² • Preis {eur(p.price)} • Miete {eur(p.rent)}/Monat
          </div>
        </div>
        <Link href="/dashboard" className="text-sm text-zinc-300 hover:underline">
          ← Zurück zum Dashboard
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Objekt">
          <div className="grid gap-3">
            <Stat label="Preis" value={eur(p.price)} />
            <Stat label="Miete (Monat)" value={eur(p.rent)} />
            <Stat label="Größe" value={`${p.size} m²`} />
          </div>
        </Card>

        <Card title="Analyse">
          {p.analysis ? (
            <div className="grid gap-3">
              <Stat label="Bruttorendite" value={`${p.analysis.grossYield.toFixed(2)} %`} />
              <Stat label="Cashflow (Monat)" value={eur(p.analysis.cashflow)} />
              <Stat label="Score" value={`${p.analysis.score} / 100`} />
            </div>
          ) : (
            <div className="text-sm text-zinc-400">
              Noch keine Analyse vorhanden. Starte sie im Dashboard über „Analysieren“.
            </div>
          )}
        </Card>

        <Card title="Angebot (Claude)">
          {p.offer ? (
            <div className="space-y-3">
              <Stat label="Vorgeschlagener Kaufpreis" value={eur(p.offer.suggestedPrice)} />
              <div className="rounded-xl border bg-zinc-950 p-3">
                <div className="text-xs text-zinc-400">Nachricht</div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-100">{p.offer.message}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-400">
              Noch kein Angebot vorhanden. Erzeuge es im Dashboard über „Angebot generieren“.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

