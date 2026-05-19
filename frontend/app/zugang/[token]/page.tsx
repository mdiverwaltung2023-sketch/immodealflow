import Link from "next/link";
import {
  PublicBuyerAccessSchema,
  SALE_DOC_LABELS,
  type SaleDocKindT,
  type PublicBuyerAccessT
} from "@/lib/api";

export const dynamic = "force-dynamic";

const DEFAULT_API_BASE = "https://api.infinityoikos.com";

function baseUrl() {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE;
  return url.replace(/\/+$/, "");
}

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

function bytesHuman(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

async function loadAccess(token: string): Promise<
  | { ok: true; data: PublicBuyerAccessT }
  | { ok: false; status: number; reason: string }
> {
  try {
    const res = await fetch(
      `${baseUrl()}/public/buyer-access/${encodeURIComponent(token)}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "unbekannt" }));
      return {
        ok: false,
        status: res.status,
        reason: typeof body?.error === "string" ? body.error : "Nicht gefunden."
      };
    }
    const json = await res.json();
    const parsed = PublicBuyerAccessSchema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, status: 500, reason: "Antwort konnte nicht ausgewertet werden." };
    }
    return { ok: true, data: parsed.data };
  } catch (e) {
    return {
      ok: false,
      status: 503,
      reason: e instanceof Error ? e.message : "Backend nicht erreichbar."
    };
  }
}

export default async function ZugangPage({
  params
}: {
  params: { token: string };
}) {
  const result = await loadAccess(params.token);

  if (!result.ok) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center p-6 text-center">
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="text-2xl font-semibold text-zinc-900">
            Diese Freigabe ist nicht (mehr) verfügbar
          </div>
          <div className="mt-3 text-sm text-zinc-600">
            {result.reason}
          </div>
          <div className="mt-6 text-xs text-zinc-400">
            Wenn du diesen Link für eine Besichtigung oder Verhandlung
            erhalten hast, frag bitte den Verkäufer nach einer aktuellen
            Freigabe.
          </div>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Zur Startseite
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data } = result;
  const expiresLabel = data.expiresAt
    ? new Date(data.expiresAt).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      })
    : null;

  const allowedSet = new Set<SaleDocKindT>(data.allowedDocKinds);
  const missingKinds = data.allowedDocKinds.filter(
    (k) => !data.documents.some((d) => d.kind === k)
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <header className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
          Vom Verkäufer freigegebene Unterlagen
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          {data.listing.title}
        </h1>
        <div className="mt-1 text-sm text-zinc-600">
          {data.listing.city}
          {data.listing.district ? ` · ${data.listing.district}` : ""}
          {data.listing.postalCode ? ` · ${data.listing.postalCode}` : ""}
          {data.listing.fullAddress ? ` · ${data.listing.fullAddress}` : ""}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-600">
          <span className="rounded-full bg-white px-3 py-1 shadow-sm">
            Angebot {eur(data.listing.askingPrice)}
          </span>
          <span className="rounded-full bg-white px-3 py-1 shadow-sm">
            Fläche {data.listing.totalArea} m²
          </span>
          {expiresLabel ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">
              Freigabe gültig bis {expiresLabel}
            </span>
          ) : null}
        </div>
        {data.buyerLabel ? (
          <div className="mt-4 text-xs text-zinc-500">
            Vorbereitet für: <span className="font-medium text-zinc-700">{data.buyerLabel}</span>
          </div>
        ) : null}
      </header>

      {/* Dokumente */}
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Unterlagen</h2>
          <span className="text-xs text-zinc-400">
            {data.documents.length} von {data.allowedDocKinds.length} verfügbar
          </span>
        </div>

        {data.documents.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
            Der Verkäufer hat die Kategorien {data.allowedDocKinds.length > 1 ? "freigegeben" : "freigegeben"},
            aber noch keine Dateien hochgeladen. Bitte schau später noch
            einmal vorbei oder frag den Verkäufer.
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {data.documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
                    {SALE_DOC_LABELS[doc.kind]}
                  </div>
                  <div className="mt-0.5 truncate text-sm text-zinc-700">
                    {doc.filename}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {bytesHuman(doc.sizeBytes)} · hochgeladen{" "}
                    {new Date(doc.createdAt).toLocaleDateString("de-DE")}
                  </div>
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Öffnen ↗
                </a>
              </li>
            ))}
          </ul>
        )}

        {missingKinds.length > 0 ? (
          <div className="mt-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Freigegeben, noch nicht hochgeladen
            </div>
            <ul className="mt-1 flex flex-wrap gap-1">
              {missingKinds.map((k) => (
                <li
                  key={k}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] text-zinc-500"
                >
                  {SALE_DOC_LABELS[k]}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 text-[11px] text-zinc-400">
          Allowed-Set: {Array.from(allowedSet).length} Kategorie(n) · Diese Seite
          ist Token-geschützt und nur über den Link erreichbar, den dir der
          Verkäufer geschickt hat.
        </div>
      </section>

      {/* Beschreibung */}
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Objekt-Beschreibung</h2>
        <div className="mt-3 whitespace-pre-wrap text-sm text-zinc-700">
          {data.listing.description}
        </div>
      </section>

      <footer className="text-center text-[10px] text-zinc-400">
        Infinity Oikos · Marketplace für Investoren und Verkäufer
      </footer>
    </div>
  );
}
