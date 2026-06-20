import Link from "next/link";
import {
  PropertyDetailSchema,
  FinancingReadinessSchema,
  InvestorProfileSchema,
  type Light
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

function eur(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}
function pct(n: number) {
  return `${n.toFixed(2).replace(".", ",")} %`;
}

const DOT: Record<Light, string> = {
  GREEN: "bg-emerald-500",
  YELLOW: "bg-amber-400",
  RED: "bg-rose-500"
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-zinc-100 py-1.5">
      <span className="text-sm text-zinc-600">{label}</span>
      <span className="text-sm font-medium text-zinc-900">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 border-b-2 border-emerald-600 pb-1 text-sm font-semibold uppercase tracking-wide text-emerald-700">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function FinanzierungsmappePage({
  params
}: {
  params: { id: string };
}) {
  await requireOnboardedUser();

  const [p, readiness, profile] = await Promise.all([
    apiGet(`/properties/${params.id}`, PropertyDetailSchema),
    apiGet(`/properties/${params.id}/financing-readiness`, FinancingReadinessSchema).catch(
      () => null
    ),
    apiGet("/me/profile", InvestorProfileSchema).catch(() => null)
  ]);

  const a = p.analyses && p.analyses.length > 0 ? p.analyses[0] : null;
  const kapitaldienst = a ? a.monthlyInterest + a.monthlyRepayment : null;
  const today = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  return (
    <div className="space-y-4">
      {/* Steuerleiste — wird beim Druck ausgeblendet */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/property/${p.id}`}
          className="text-sm text-zinc-600 hover:text-emerald-700 hover:underline"
        >
          ← Zurück zum Objekt
        </Link>
        <PrintButton />
      </div>

      {/* Nur dieser Block wird gedruckt */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #mappe, #mappe * { visibility: visible !important; }
          #mappe { position: absolute; left: 0; top: 0; width: 100%; padding: 0; box-shadow: none; border: none; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div
        id="mappe"
        className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm"
      >
        {/* Kopf */}
        <div className="flex items-start justify-between border-b border-zinc-200 pb-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Infinity Oikos · Capital Layer
            </div>
            <h1 className="mt-1 text-2xl font-bold text-zinc-900">Finanzierungsmappe</h1>
            <div className="mt-1 text-sm text-zinc-500">{p.title}</div>
          </div>
          <div className="text-right text-xs text-zinc-500">
            Stand: {today}
            <br />
            Vertraulich
          </div>
        </div>

        {/* 1 — Objekt */}
        <Section title="1 · Objektzusammenfassung">
          <Row label="Bezeichnung" value={p.title} />
          <Row label="Lage" value={p.location} />
          <Row label="Wohn-/Nutzfläche" value={`${p.size} m²`} />
          <Row label="Kaufpreis" value={eur(p.price)} />
          <Row label="Ist-Miete (Monat)" value={eur(p.rent)} />
          <Row label="Bruttomietrendite" value={p.price > 0 ? pct((p.rent * 12 / p.price) * 100) : "—"} />
        </Section>

        {/* 2 — Wirtschaftlichkeit */}
        <Section title="2 · Wirtschaftlichkeit & Cashflow">
          {a ? (
            <>
              <Row label="Szenario" value={a.scenarioName} />
              <Row label="Gesamtinvestition (inkl. Nebenkosten)" value={eur(a.totalInvestment)} />
              <Row label="Eingesetztes Eigenkapital (Szenario)" value={eur(a.equity)} />
              <Row label="Darlehen (Szenario)" value={eur(a.loan)} />
              <Row label="Bruttorendite" value={pct(a.grossYield)} />
              <Row label="Nettorendite" value={pct(a.netYield)} />
              <Row label="Cashflow vor Steuer (Monat)" value={eur(Math.round(a.cashflow))} />
              <Row label="Cashflow nach Steuer (Monat)" value={eur(Math.round(a.cashflowAfterTax))} />
            </>
          ) : (
            <p className="text-sm text-zinc-500">
              Noch kein Analyse-Szenario hinterlegt. Lege auf der Objektseite ein
              Szenario an, um die Wirtschaftlichkeit aufzunehmen.
            </p>
          )}
        </Section>

        {/* 3 — Kapitaldienst */}
        <Section title="3 · Kapitaldienstberechnung">
          {a ? (
            <>
              <Row label="Zins (Monat)" value={eur(Math.round(a.monthlyInterest))} />
              <Row label="Tilgung (Monat)" value={eur(Math.round(a.monthlyRepayment))} />
              <Row label="Kapitaldienst gesamt (Monat)" value={eur(Math.round(kapitaldienst ?? 0))} />
              <Row label="Annahmen" value={`Zins ${pct(a.loanInterestRate * 100)} · Tilgung ${pct(a.loanRepaymentRate * 100)}`} />
            </>
          ) : (
            <p className="text-sm text-zinc-500">Ohne Analyse-Szenario nicht berechnet.</p>
          )}
        </Section>

        {/* 4 — Selbstauskunft */}
        <Section title="4 · Selbstauskunft des Investors">
          {profile ? (
            <>
              <Row label="Eigenkapital" value={eur(profile.equity ?? null)} />
              <Row label="Monatliches Nettoeinkommen" value={eur(profile.monthlyIncome ?? null)} />
              <Row label="Laufende Verbindlichkeiten (Monat)" value={eur(profile.monthlyDebt ?? null)} />
              <Row
                label="Max. Darlehen ggü. Einkommen (Faustformel)"
                value={eur(profile.affordability.maxLoan)}
              />
              <Row
                label="Finanzierungs-Vorabzusage"
                value={profile.financingPreApproved ? "Ja" : "Nein"}
              />
              {profile.financingNote ? (
                <Row label="Hinweis" value={profile.financingNote} />
              ) : null}
              <Row
                label="Investment-Erfahrung"
                value={`${profile.investmentExperienceYears} Jahre`}
              />
            </>
          ) : (
            <p className="text-sm text-zinc-500">Kein Investor-Profil hinterlegt.</p>
          )}
        </Section>

        {/* 5 — Bankfähigkeit */}
        <Section title="5 · Bankfähigkeits-Einschätzung">
          {readiness ? (
            <>
              <div className="mb-2 flex items-center gap-2">
                <span className={`inline-block h-3 w-3 rounded-full ${DOT[readiness.overall]}`} />
                <span className="text-sm font-semibold text-zinc-900">
                  {readiness.overallLabel}
                </span>
                <span className="text-xs text-zinc-500">
                  (Score {readiness.readinessScore}/100)
                </span>
              </div>
              {readiness.criteria.map((c) => (
                <div
                  key={c.key}
                  className="flex items-center justify-between gap-4 border-b border-zinc-100 py-1.5"
                >
                  <span className="flex items-center gap-2 text-sm text-zinc-700">
                    <span className={`inline-block h-2 w-2 rounded-full ${DOT[c.light]}`} />
                    {c.label}
                  </span>
                  <span className="text-sm font-medium text-zinc-900">{c.value}</span>
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-zinc-500">
              Bankfähigkeit nicht verfügbar (keine Miete hinterlegt).
            </p>
          )}
        </Section>

        {/* Disclaimer */}
        <p className="mt-8 border-t border-zinc-200 pt-3 text-[10px] leading-relaxed text-zinc-400">
          Diese Finanzierungsmappe ist eine organisatorische Aufbereitung der im
          System vorhandenen Daten und stellt eine Selbsteinschätzung der
          allgemeinen Bankfähigkeit dar — keine Finanzierungsberatung und keine
          Empfehlung eines konkreten Kreditprodukts. Die konkrete Prüfung und
          Vermittlung erfolgt durch einen Finanzierungspartner. Angaben ohne
          Gewähr.
        </p>
      </div>
    </div>
  );
}
