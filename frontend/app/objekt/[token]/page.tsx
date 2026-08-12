import {
  PublicExposeSchema,
  SALE_DOC_ORDER,
  type SaleDocKindT,
  type PublicExposeT
} from "@/lib/api";
import { PrintButton } from "@/app/expose/[id]/PrintButton";
import { ExposeBody, type ExposeViewData } from "@/app/expose/[id]/ExposeBody";

export const dynamic = "force-dynamic";

const DEFAULT_API_BASE = "https://api.infinityoikos.com";

function baseUrl() {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE;
  return url.replace(/\/+$/, "");
}

async function loadExpose(token: string): Promise<
  { ok: true; data: PublicExposeT } | { ok: false; reason: string }
> {
  try {
    const res = await fetch(`${baseUrl()}/public/expose/${encodeURIComponent(token)}`, {
      cache: "no-store"
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "unbekannt" }));
      return { ok: false, reason: typeof body?.error === "string" ? body.error : "Nicht gefunden." };
    }
    const parsed = PublicExposeSchema.safeParse(await res.json());
    if (!parsed.success) return { ok: false, reason: "Antwort konnte nicht ausgewertet werden." };
    return { ok: true, data: parsed.data };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "Nicht erreichbar." };
  }
}

export default async function ObjektExposePage({ params }: { params: { token: string } }) {
  const result = await loadExpose(params.token);

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-700">Infinity Oikos</div>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900">Exposé nicht verfügbar</h1>
        <p className="mt-2 text-sm text-zinc-500">{result.reason}</p>
        <p className="mt-6 text-xs text-zinc-400">
          Der Link ist möglicherweise abgelaufen oder wurde widerrufen. Bitte wenden Sie sich an Ihren Ansprechpartner.
        </p>
      </div>
    );
  }

  const d = result.data;
  const allowed = new Set(d.allowedDocKinds);
  const docKinds: SaleDocKindT[] = SALE_DOC_ORDER.filter((k) => allowed.has(k));
  const docByKind = new Map<SaleDocKindT, { url: string }>();
  for (const doc of d.documents) {
    if (!docByKind.has(doc.kind)) docByKind.set(doc.kind, { url: doc.url });
  }

  const data: ExposeViewData = {
    reference: d.reference,
    isPublic: true,
    listing: d.listing,
    expose: d.expose,
    docByKind,
    docKinds
  };

  return (
    <div className="space-y-4 bg-zinc-100 py-6">
      <div className="no-print mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4">
        <div className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-700">Infinity Oikos</div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400">Tipp: im Druckdialog „Hintergrundgrafiken“ aktivieren</span>
          <PrintButton />
        </div>
      </div>

      <ExposeBody data={data} />
    </div>
  );
}
