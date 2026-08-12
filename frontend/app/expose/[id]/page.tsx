import Link from "next/link";
import { z } from "zod";
import {
  ListingSchema,
  SaleProcessListItemSchema,
  SaleProcessDetailSchema,
  SALE_DOC_ORDER,
  ExposeContentSchema,
  type SaleDocKindT
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { PrintButton } from "./PrintButton";
import { ExposeCopyControls } from "./ExposeCopyControls";
import { ExposeBody, type ExposeViewData } from "./ExposeBody";

export const dynamic = "force-dynamic";

// Eigentümer-Vorschau des Exposés (/expose/[listingId]). Rendert das
// gemeinsame ExposeBody; darüber die App-Leiste + KI-Steuerung (No-Print).

export default async function ExposePage({ params }: { params: { id: string } }) {
  await requireOnboardedUser();

  const l = await apiGet(`/me/listings/${params.id}`, ListingSchema);

  // Datenraum: vorhandene Verkaufsunterlagen aus der Verkaufsabwicklung.
  const processes = await apiGet(
    `/me/sale-processes?listingId=${l.id}`,
    z.array(SaleProcessListItemSchema)
  ).catch(() => [] as z.infer<typeof SaleProcessListItemSchema>[]);
  const activeProc =
    processes.find((p) => !["ABGESCHLOSSEN", "ABGEBROCHEN"].includes(p.currentStage)) ??
    processes[0] ??
    null;
  const procDetail = activeProc
    ? await apiGet(`/me/sale-processes/${activeProc.id}`, SaleProcessDetailSchema).catch(() => null)
    : null;
  const docByKind = new Map<SaleDocKindT, { url: string }>();
  for (const d of procDetail?.documents ?? []) {
    if (!docByKind.has(d.kind)) docByKind.set(d.kind, { url: d.url });
  }

  const expose = await apiGet(
    `/me/listings/${l.id}/expose`,
    ExposeContentSchema.nullable()
  ).catch(() => null);

  const data: ExposeViewData = {
    reference: `OIKOS-${l.id.slice(-6).toUpperCase()}`,
    isPublic: false,
    listing: l,
    expose,
    docByKind,
    docKinds: [...SALE_DOC_ORDER]
  };

  return (
    <div className="space-y-4 bg-zinc-100 py-6">
      {/* App-Leiste (wird nicht gedruckt) */}
      <div className="no-print mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4">
        <Link href={`/listings/${l.id}/edit`} className="text-sm text-zinc-600 hover:text-teal-700 hover:underline">
          ← Zurück zum Inserat
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400">Tipp: im Druckdialog „Hintergrundgrafiken“ aktivieren</span>
          <PrintButton />
        </div>
      </div>

      {/* KI-Steuerung (nur Bildschirm) */}
      <div className="no-print mx-auto max-w-4xl px-4">
        <ExposeCopyControls listingId={l.id} initial={expose} />
      </div>

      <ExposeBody data={data} />
    </div>
  );
}
