import Link from "next/link";
import {
  SaleProcessDetailSchema,
  SALE_STAGE_LABELS,
  SALE_STAGE_ORDER
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { StageStepper } from "./StageStepper";
import { DocumentCenter } from "./DocumentCenter";
import { ProcessFields } from "./ProcessFields";

export const dynamic = "force-dynamic";

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

export default async function SaleProcessDetailPage({
  params
}: {
  params: { id: string };
}) {
  await requireOnboardedUser();
  const process = await apiGet(`/me/sale-processes/${params.id}`, SaleProcessDetailSchema);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/sales"
            className="text-xs text-zinc-500 hover:text-indigo-700 hover:underline"
          >
            ← Verkaufsabwicklung
          </Link>
          <div className="mt-1 text-2xl font-semibold text-zinc-900 truncate">
            {process.listing.title}
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            {process.listing.city}
            {process.listing.district ? ` · ${process.listing.district}` : ""}
            {process.buyer ? (
              <>
                {" · Käufer: "}
                <span className="text-zinc-700">{process.buyer.name ?? "—"}</span>
              </>
            ) : null}
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            Aktueller Status
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
            {SALE_STAGE_LABELS[process.currentStage]}
          </div>
          <div className="mt-1 text-[10px] text-zinc-400">
            seit {new Date(process.stageEnteredAt).toLocaleDateString("de-DE")}
          </div>
        </div>
      </div>

      <Card title="Stationen">
        <StageStepper
          processId={process.id}
          currentStage={process.currentStage}
          allStages={SALE_STAGE_ORDER}
        />
      </Card>

      <Card title="Eckdaten">
        <ProcessFields
          processId={process.id}
          notes={process.notes ?? null}
          agreedPrice={process.agreedPrice ?? null}
          targetClosingDate={process.targetClosingDate ?? null}
          listingPrice={process.listing.askingPrice}
        />
      </Card>

      <Card title="Dokumente">
        <DocumentCenter processId={process.id} initialDocs={process.documents} />
      </Card>

      {process.stageLog.length > 0 ? (
        <Card title={`Verlauf (${process.stageLog.length})`}>
          <ul className="divide-y divide-zinc-200">
            {process.stageLog.map((entry) => (
              <li key={entry.id} className="py-2 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-zinc-900">
                    {SALE_STAGE_LABELS[entry.stage]}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {new Date(entry.createdAt).toLocaleString("de-DE")}
                  </span>
                </div>
                {entry.note ? (
                  <div className="mt-0.5 text-xs text-zinc-500 whitespace-pre-wrap">
                    {entry.note}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {process.inquiry ? (
        <Card title="Ursprüngliche Anfrage">
          <div className="text-xs text-zinc-500">
            vom {new Date(process.inquiry.createdAt).toLocaleDateString("de-DE")}
          </div>
          <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
            {process.inquiry.message}
          </div>
        </Card>
      ) : null}

      <div className="text-xs text-zinc-400">
        Listing-Preis: {eur(process.listing.askingPrice)} · Inserat-ID:{" "}
        <Link
          href={`/listings/${process.listing.id}/edit`}
          className="hover:text-indigo-700 hover:underline"
        >
          {process.listing.id}
        </Link>
      </div>
    </div>
  );
}
