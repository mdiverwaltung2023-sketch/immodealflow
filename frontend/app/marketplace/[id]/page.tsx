import Link from "next/link";
import {
  ASSET_TYPE_LABELS,
  ANONYMIZATION_LABELS,
  MarketplaceListingDetailSchema
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { StarSummary } from "@/components/StarRating";
import { ImageGallery } from "@/components/ImageGallery";
import { InquiryActions } from "./InquiryActions";

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

function num(n: number, digits = 0) {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(n);
}

export default async function MarketplaceDetailPage({ params }: { params: { id: string } }) {
  await requireOnboardedUser();
  const l = await apiGet(`/marketplace/${params.id}`, MarketplaceListingDetailSchema);

  const yieldGross = l.totalRent ? ((l.totalRent * 12) / l.askingPrice) * 100 : null;
  const pricePerSqm = l.totalArea > 0 ? l.askingPrice / l.totalArea : null;
  const monthlyRentPerSqm = l.totalRent && l.totalArea > 0 ? l.totalRent / l.totalArea : null;
  const locationParts = [l.city, l.district, l.postalCode].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Link href="/marketplace" className="hover:text-indigo-700">
          Marketplace
        </Link>
        <span>›</span>
        <span className="text-zinc-700">{ASSET_TYPE_LABELS[l.propertyType]}</span>
        <span>›</span>
        <span className="text-zinc-700">{l.city}</span>
        <span>›</span>
        <span className="text-zinc-900 font-medium truncate max-w-xs">{l.title}</span>
      </nav>

      {/* Galerie */}
      <ImageGallery images={l.images} title={l.title} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
              {ASSET_TYPE_LABELS[l.propertyType]}
            </span>
            <span className="text-xs text-zinc-500">
              Inseriert am {new Date(l.createdAt).toLocaleDateString("de-DE")}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 lg:text-3xl">
            {l.title}
          </h1>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{locationParts.join(", ")}</span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="text-3xl font-bold tracking-tight text-zinc-900">
            {eur(l.askingPrice)}
          </div>
          {pricePerSqm != null ? (
            <div className="text-xs text-zinc-500">
              {eur(Math.round(pricePerSqm))} pro m²
            </div>
          ) : null}
        </div>
      </div>

      {/* Hauptlayout: 2/3 Content + 1/3 Sticky Sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          {/* Eckdaten-Strip */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-4">
            <KeyStat
              label="Fläche"
              value={`${num(l.totalArea, 0)} m²`}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V3h4M21 7V3h-4M3 17v4h4M21 17v4h-4" />
                </svg>
              }
            />
            <KeyStat
              label="Sollmiete / Mon."
              value={l.totalRent ? eur(l.totalRent) : "—"}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              }
            />
            <KeyStat
              label="Bruttorendite"
              value={yieldGross != null ? `${num(yieldGross, 2)} %` : "—"}
              accent={yieldGross != null && yieldGross >= 5 ? "emerald" : "default"}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              }
            />
            <KeyStat
              label="Miete pro m²"
              value={monthlyRentPerSqm != null ? `${num(monthlyRentPerSqm, 2)} €` : "—"}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              }
            />
          </div>

          {/* Beschreibung */}
          {l.description.trim() ? (
            <Section title="Beschreibung">
              <div className="prose prose-zinc max-w-none whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                {l.description}
              </div>
            </Section>
          ) : null}

          {/* Lage */}
          <Section title="Lage">
            <div className="grid gap-3 sm:grid-cols-3">
              <Detail label="Stadt" value={l.city} />
              {l.district ? <Detail label="Stadtteil" value={l.district} /> : null}
              {l.postalCode ? <Detail label="PLZ" value={l.postalCode} /> : null}
              {l.fullAddress ? (
                <div className="sm:col-span-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                    Vollständige Adresse
                  </div>
                  <div className="mt-1 text-sm font-semibold text-emerald-900">{l.fullAddress}</div>
                </div>
              ) : (
                <div className="sm:col-span-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
                  Vollständige Adresse erst nach Anfrage-Annahme. Aktuelle Anonymisierung:{" "}
                  <span className="font-semibold text-zinc-900">
                    {ANONYMIZATION_LABELS[l.anonymizationLevel]}
                  </span>
                  .
                </div>
              )}
            </div>
          </Section>

          {/* Eckdaten */}
          <Section title="Wirtschaftliche Eckdaten">
            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label="Angebotspreis" value={eur(l.askingPrice)} />
              <Detail label="Gesamtfläche" value={`${num(l.totalArea)} m²`} />
              {l.totalRent ? (
                <Detail label="Sollmiete (Monat)" value={eur(l.totalRent)} />
              ) : null}
              {pricePerSqm != null ? (
                <Detail label="Preis pro m²" value={eur(Math.round(pricePerSqm))} />
              ) : null}
              {yieldGross != null ? (
                <Detail label="Bruttorendite" value={`${num(yieldGross, 2)} %`} />
              ) : null}
              {monthlyRentPerSqm != null ? (
                <Detail label="Miete pro m² / Monat" value={`${num(monthlyRentPerSqm, 2)} €`} />
              ) : null}
            </div>
          </Section>
        </div>

        {/* Sticky Sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start space-y-4">
          {/* Verkäufer-Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Verkäufer
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700">
                {(l.owner.name ?? "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-zinc-900">
                  {l.owner.name ?? "Anonym"}
                </div>
                <div className="text-xs text-zinc-500">
                  {l.owner.role === "INVESTOR"
                    ? "Investor"
                    : l.owner.role === "SELLER"
                    ? "Verkäufer"
                    : "Investor + Verkäufer"}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <StarSummary summary={l.sellerRating ?? null} size="md" />
            </div>
          </div>

          {/* Anfrage-CTA */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Anfrage stellen</div>
            <div className="mt-1 text-xs text-zinc-500">
              Verkäufer sieht dein Investor-Profil. Bei Annahme bekommst du die vollständige Adresse + Kontaktdaten.
            </div>
            <div className="mt-4">
              <InquiryActions
                listingId={l.id}
                isOwner={l.isOwner}
                listingStatus={l.status}
                myInquiry={l.myInquiry ?? null}
              />
            </div>
          </div>

          {/* Kennzahlen-Schnellblick */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Kennzahlen
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-zinc-500">Preis</span>
                <span className="font-semibold text-zinc-900">{eur(l.askingPrice)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-zinc-500">Fläche</span>
                <span className="font-semibold text-zinc-900">{num(l.totalArea)} m²</span>
              </li>
              {l.totalRent ? (
                <li className="flex justify-between">
                  <span className="text-zinc-500">Miete</span>
                  <span className="font-semibold text-zinc-900">{eur(l.totalRent)}/Mon.</span>
                </li>
              ) : null}
              {yieldGross != null ? (
                <li className="flex justify-between">
                  <span className="text-zinc-500">Bruttorendite</span>
                  <span className={`font-semibold ${yieldGross >= 5 ? "text-emerald-700" : "text-zinc-900"}`}>
                    {num(yieldGross, 2)} %
                  </span>
                </li>
              ) : null}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- Building blocks ---------- */

function KeyStat({
  label,
  value,
  icon,
  accent = "default"
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: "default" | "emerald";
}) {
  const valueCls = accent === "emerald" ? "text-emerald-700" : "text-zinc-900";
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
        <div className={`text-sm font-semibold ${valueCls}`}>{value}</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-zinc-900">{value}</div>
    </div>
  );
}
