import Link from "next/link";
import { PropertyDetailSchema } from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card, Stat, StatusBadge } from "@/components/ui";
import { StatusEditor } from "./StatusEditor";
import { NotesPanel } from "./NotesPanel";
import { PropertyHeaderActions } from "./PropertyHeaderActions";
import { AnalysesPanel } from "./AnalysesPanel";
import { MarketComparisonPanel } from "./MarketComparisonPanel";
import { AuctionPanel } from "./AuctionPanel";

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

export default async function PropertyPage({ params }: { params: { id: string } }) {
  await requireOnboardedUser();
  const p = await apiGet(`/properties/${params.id}`, PropertyDetailSchema);
  const latestAnalysis = p.analyses && p.analyses.length > 0 ? p.analyses[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-2xl font-semibold">{p.title}</div>
            <StatusBadge status={p.status} />
          </div>
          <div className="mt-1 text-sm text-zinc-400">
            {p.location} • {p.size} m² • Preis {eur(p.price)} • Miete {eur(p.rent)}/Monat
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PropertyHeaderActions id={p.id} />
          <Link href="/dashboard" className="text-sm text-zinc-300 hover:underline">
            ← Zurück zum Dashboard
          </Link>
        </div>
      </div>

      {p.dealType === "AUCTION" && p.auction ? (
        <Card title="Versteigerung">
          <AuctionPanel id={p.id} initial={p.auction} />
        </Card>
      ) : null}

      <Card title="Pipeline-Status">
        <StatusEditor id={p.id} initialStatus={p.status} />
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Objekt">
          <div className="grid gap-3">
            <Stat label="Preis" value={eur(p.price)} />
            <Stat label="Miete (Monat)" value={eur(p.rent)} />
            <Stat label="Größe" value={`${p.size} m²`} />
          </div>
        </Card>

        <Card title="Aktuelle Analyse">
          {latestAnalysis ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Szenario</span>
                <span className="text-sm font-semibold text-white">{latestAnalysis.scenarioName}</span>
              </div>
              <Stat label="Bruttorendite" value={`${latestAnalysis.grossYield.toFixed(2)} %`} />
              <Stat label="Nettorendite" value={`${latestAnalysis.netYield.toFixed(2)} %`} />
              <Stat label="Cashflow n. Steuer" value={`${eur(latestAnalysis.cashflowAfterTax)}/Mon.`} />
              <Stat label="Score" value={`${latestAnalysis.score} / 100`} />
            </div>
          ) : (
            <div className="text-sm text-zinc-400">
              Noch keine Analyse vorhanden. Lege unten ein Szenario an.
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
              Noch kein Angebot vorhanden. Erzeuge es im Dashboard über „Angebot generieren".
            </div>
          )}
        </Card>
      </div>

      <Card title="Marktvergleich (Claude)">
        <MarketComparisonPanel
          id={p.id}
          initial={p.marketComparison ?? null}
          property={{ price: p.price, rent: p.rent, size: p.size }}
        />
      </Card>

      <Card title={`Analyse-Szenarien (${p.analyses?.length ?? 0})`}>
        <AnalysesPanel id={p.id} initialAnalyses={p.analyses ?? []} />
      </Card>

      <Card title={`Notizen (${p.notes?.length ?? 0})`}>
        <NotesPanel id={p.id} initialNotes={p.notes ?? []} />
      </Card>
    </div>
  );
}
