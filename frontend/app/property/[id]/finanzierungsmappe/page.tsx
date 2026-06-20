import Link from "next/link";
import {
  PropertyDetailSchema,
  FinancingReadinessSchema,
  InvestorProfileSchema,
  MARKET_RATING_LABELS,
  type Light
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { PrintButton } from "./PrintButton";
import {
  DEFAULT_ASSUMPTIONS,
  type Assumptions,
  fullAnalysis,
  dscr,
  amortization,
  stressTest,
  wealthProjection,
  returnMetrics,
  computeDealRating
} from "./compute";
import {
  ScoreDonut,
  HBars,
  RangeBar,
  AreaChart,
  StressBars,
  MiniAmpel,
  lightColor
} from "./charts";

export const dynamic = "force-dynamic";

const APPRECIATION = 0.015;

function eur(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(Math.round(n));
}
function pct(n: number) {
  return `${n.toFixed(2).replace(".", ",")} %`;
}
function dec(n: number) {
  return Number.isFinite(n) ? n.toFixed(2).replace(".", ",") : "∞";
}

const DOT: Record<Light, string> = {
  GREEN: "bg-emerald-500",
  YELLOW: "bg-amber-400",
  RED: "bg-rose-500"
};

function Section({ no, title, children, pageBreak }: { no: string; title: string; children: React.ReactNode; pageBreak?: boolean }) {
  return (
    <section className={`mt-8 break-inside-avoid${pageBreak ? " break-before-page" : ""}`}>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
          {no}
        </div>
        <h2 className="text-base font-bold text-zinc-900">{title}</h2>
        <div className="h-px flex-1 bg-zinc-200" />
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="mt-1 text-lg font-bold" style={{ color: color ?? "#18181b" }}>
        {value}
      </div>
      {sub ? <div className="text-[11px] text-zinc-500">{sub}</div> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-zinc-100 py-1.5">
      <span className="text-sm text-zinc-600">{label}</span>
      <span className="text-sm font-medium text-zinc-900">{value}</span>
    </div>
  );
}

export default async function FinanzierungsmappePage({ params }: { params: { id: string } }) {
  await requireOnboardedUser();

  const [p, readiness, profile] = await Promise.all([
    apiGet(`/properties/${params.id}`, PropertyDetailSchema),
    apiGet(`/properties/${params.id}/financing-readiness`, FinancingReadinessSchema).catch(() => null),
    apiGet("/me/profile", InvestorProfileSchema).catch(() => null)
  ]);

  // Konsistent zur Bankfähigkeits-Ampel: IMMER aus dem TATSÄCHLICHEN
  // Eigenkapital (Profil) rechnen, nicht aus einer gespeicherten Analyse —
  // sonst widersprechen sich Dashboard und Bankfähigkeit (DSCR/LTV).
  const asum: Assumptions = (() => {
    const d = { ...DEFAULT_ASSUMPTIONS };
    const ti = p.price * (1 + d.closingCostsRate);
    if (profile?.equity != null && ti > 0) {
      d.equityRatio = Math.max(0.05, Math.min(0.95, profile.equity / ti));
    }
    return d;
  })();

  const fa = fullAnalysis(p.price, p.rent, asum);
  const kapitaldienst = fa.monthlyInterest + fa.monthlyRepayment;
  const dscrVal = dscr(fa.noiMonthly, kapitaldienst);
  const ltv = p.price > 0 ? fa.loan / p.price : 0;
  const ret = returnMetrics(fa, fa.netYield);
  const amort = amortization(fa.loan, asum.loanInterestRate, asum.loanRepaymentRate, 30);
  const rest10 = amort.find((y) => y.year === 10)?.restschuld ?? 0;
  const stress = stressTest(p.price, p.rent, asum);
  const wealth = wealthProjection(p.price, fa.loan, asum.loanInterestRate, asum.loanRepaymentRate, APPRECIATION, 15);
  const wealth10 = wealth.find((w) => w.year === 10);

  const rating = computeDealRating(fa.netYield, stress, readiness?.readinessScore ?? null, p.marketComparison?.rating ?? null);
  const ratingColor = rating.grade === "A" ? "#059669" : rating.grade === "B" ? "#0d9488" : rating.grade === "C" ? "#f59e0b" : "#e11d48";

  const today = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const pricePerSqm = p.size > 0 ? p.price / p.size : 0;
  const rentPerSqm = p.size > 0 ? p.rent / p.size : 0;
  const mc = p.marketComparison ?? null;

  const amYears = [0, ...amort.map((r) => r.year)];
  const amRest = [fa.loan, ...amort.map((r) => r.restschuld)];
  const amTilg = [0, ...amort.map((r) => r.kumTilgung)];

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href={`/property/${p.id}`} className="text-sm text-zinc-600 hover:text-emerald-700 hover:underline">
          ← Zurück zum Objekt
        </Link>
        <PrintButton />
      </div>

      <style>{`
        #print-footer { display: none; }
        @media print {
          @page { margin: 1.4cm; }
          body * { visibility: hidden !important; }
          #mappe, #mappe * { visibility: visible !important; }
          #mappe { position: absolute; left: 0; top: 0; width: 100%; padding: 0; box-shadow: none; border: none; }
          .no-print { display: none !important; }
          .break-before-page { break-before: page; }
          #print-footer { display: block; position: fixed; bottom: 4px; left: 0; right: 0; text-align: center; font-size: 8px; color: #a1a1aa; }
        }
        #mappe { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>

      <div id="mappe" className="mx-auto max-w-4xl space-y-1 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 p-8 text-white">
          <div className="absolute right-6 top-6 z-10 flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg">
              <span className="text-4xl font-extrabold" style={{ color: ratingColor }}>{rating.grade}</span>
            </div>
            <div className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-100">Oikos Deal-Rating</div>
            <div className="text-[11px] font-medium text-white">{rating.label}</div>
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-100">
            Infinity Oikos · Capital Layer
          </div>
          <div className="mt-6 text-3xl font-extrabold leading-tight">Finanzierungsmappe</div>
          <div className="mt-1 text-lg font-medium text-emerald-50">{p.title}</div>
          <div className="mt-1 text-sm text-emerald-100">
            {p.location} · {p.size} m² · {p.dealType === "AUCTION" ? "Zwangsversteigerung" : "Freier Verkauf"}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Kaufpreis", eur(p.price)],
              ["Ist-Miete/Monat", eur(p.rent)],
              ["Bruttorendite", pct(fa.grossYield)],
              ["Readiness", readiness ? `${readiness.readinessScore}/100` : "—"]
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
                <div className="text-[10px] uppercase tracking-wide text-emerald-100">{l}</div>
                <div className="text-lg font-bold">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between text-xs text-emerald-100">
            <span>Stand: {today}</span>
            <span>Vertraulich · nur für den Adressaten</span>
          </div>
        </div>

        <Section no="1" title="Kennzahlen-Dashboard">
          <div className="flex flex-wrap items-center gap-6">
            {readiness ? (
              <div className="flex items-center gap-4">
                <ScoreDonut score={readiness.readinessScore} caption="Financing-Readiness" />
                <div>
                  <MiniAmpel light={readiness.overall} />
                  <div className="mt-1 text-sm font-semibold" style={{ color: lightColor(readiness.readinessScore) }}>
                    {readiness.overallLabel}
                  </div>
                </div>
              </div>
            ) : null}
            <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
              <Kpi label="Nettorendite" value={pct(fa.netYield)} />
              <Kpi label="Cashflow n. St." value={`${eur(Math.round(fa.cashflowAfterTax))}/M`} color={fa.cashflowAfterTax >= 0 ? "#059669" : "#e11d48"} />
              <Kpi label="DSCR" value={dec(dscrVal)} sub="Kapitaldienstdeckung" />
              <Kpi label="Beleihung (LTV)" value={pct(ltv * 100)} />
              <Kpi label="EK-Rendite" value={pct(ret.cashOnCash)} sub="Cash-on-Cash" />
              <Kpi label="Gesamtrendite EK" value={pct(ret.totalRoe)} sub="inkl. Tilgung" />
            </div>
          </div>
        </Section>

        <Section no="2" title="Objekt & Marktposition">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <Row label="Bezeichnung" value={p.title} />
              <Row label="Lage" value={p.location} />
              <Row label="Fläche" value={`${p.size} m²`} />
              <Row label="Kaufpreis" value={eur(p.price)} />
              <Row label="Kaufpreis / m²" value={`${eur(pricePerSqm)}`} />
              <Row label="Ist-Miete / Monat" value={eur(p.rent)} />
              <Row label="Miete / m²" value={`${eur(rentPerSqm)}`} />
              <Row label="Kaufpreisfaktor" value={`${dec(p.rent > 0 ? p.price / (p.rent * 12) : 0)}-fach`} />
            </div>
            <div>
              {mc ? (
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Marktvergleich (KI) — {MARKET_RATING_LABELS[mc.rating]}
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-zinc-500">Kaufpreis / m² ggü. Marktspanne</div>
                    <RangeBar low={mc.pricePerSqmLow} high={mc.pricePerSqmHigh} value={pricePerSqm} unit="€/m²" />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-zinc-500">Miete / m² ggü. Marktspanne</div>
                    <RangeBar low={mc.rentPerSqmLow} high={mc.rentPerSqmHigh} value={rentPerSqm} unit="€/m²" />
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-500">{mc.rationale}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
                  Kein KI-Marktvergleich hinterlegt. Auf der Objektseite „Marktvergleich
                  erstellen", um Kaufpreis und Miete gegen die Marktspanne einzuordnen.
                </div>
              )}
              {p.dealType === "AUCTION" && p.auction?.bidLimit ? (
                <div className="mt-3 rounded-xl bg-emerald-50 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    Oikos Bietlimit (Cashflow-neutral)
                  </div>
                  <div className="text-lg font-bold text-emerald-700">{eur(p.auction.bidLimit)}</div>
                  {p.auction.marketValue ? (
                    <div className="text-[11px] text-zinc-500">Verkehrswert lt. Gutachten: {eur(p.auction.marketValue)}</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </Section>

        <Section no="3" title="Wirtschaftlichkeit & Cashflow">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <Row label="Gesamtinvestition" value={eur(fa.totalInvestment)} />
              <Row label="davon Kaufnebenkosten" value={eur(fa.closingCosts)} />
              <Row label="Eigenkapital" value={eur(fa.equity)} />
              <Row label="Darlehen" value={eur(fa.loan)} />
              <Row label="Bruttomietrendite" value={pct(fa.grossYield)} />
              <Row label="Nettomietrendite" value={pct(fa.netYield)} />
              <Row label="Cashflow vor Steuer / Monat" value={eur(Math.round(fa.cashflow))} />
              <Row label="Cashflow nach Steuer / Monat" value={eur(Math.round(fa.cashflowAfterTax))} />
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Monatlicher Mittelfluss</div>
              <HBars
                items={[
                  { label: "Effektive Miete", value: fa.effectiveRent, max: fa.effectiveRent, color: "#0d9488", valueLabel: eur(fa.effectiveRent) },
                  { label: "− Bewirtschaftung", value: fa.monthlyMaintenance, max: fa.effectiveRent, color: "#f59e0b", valueLabel: eur(fa.monthlyMaintenance) },
                  { label: "− Zins", value: fa.monthlyInterest, max: fa.effectiveRent, color: "#e11d48", valueLabel: eur(fa.monthlyInterest) },
                  { label: "− Tilgung", value: fa.monthlyRepayment, max: fa.effectiveRent, color: "#6366f1", valueLabel: eur(fa.monthlyRepayment) },
                  { label: "= Cashflow v. St.", value: Math.max(0, fa.cashflow), max: fa.effectiveRent, color: "#059669", valueLabel: eur(Math.round(fa.cashflow)) }
                ]}
              />
              <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600">
                <span className="font-semibold text-zinc-800">Leverage-Effekt:</span> Die
                Fremdfinanzierung hebt die Eigenkapitalrendite auf{" "}
                <span className="font-semibold text-emerald-700">{pct(ret.totalRoe)}</span>{" "}
                (Nettorendite {pct(fa.netYield)}, Hebel +{pct(Math.max(0, ret.leverageGain))}).
              </div>
            </div>
          </div>
        </Section>

        <Section no="4" title="Kapitaldienst & Tilgungsverlauf" pageBreak>
          <div className="grid gap-6 sm:grid-cols-5">
            <div className="sm:col-span-2">
              <Row label="Zins / Monat" value={eur(fa.monthlyInterest)} />
              <Row label="Tilgung / Monat" value={eur(fa.monthlyRepayment)} />
              <Row label="Kapitaldienst / Monat" value={eur(kapitaldienst)} />
              <Row label="Kapitaldienst / Jahr" value={eur(kapitaldienst * 12)} />
              <Row label="DSCR" value={dec(dscrVal)} />
              <Row label="Restschuld nach 10 J." value={eur(rest10)} />
              <Row label="Annahmen" value={`${pct(asum.loanInterestRate * 100)} Zins · ${pct(asum.loanRepaymentRate * 100)} Tilgung`} />
            </div>
            <div className="sm:col-span-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Restschuld &amp; kumulierte Tilgung</div>
              <AreaChart
                series={[
                  { points: amRest, color: "#e11d48", fill: "#fecdd3", label: "Restschuld" },
                  { points: amTilg, color: "#059669", fill: "#a7f3d0", label: "Getilgt" }
                ]}
                xLabels={amYears.map((y) => (y % 5 === 0 ? `${y}J` : ""))}
              />
              <div className="flex gap-4 text-[11px] text-zinc-500">
                <span><span className="inline-block h-2 w-2 rounded-full" style={{ background: "#e11d48" }} /> Restschuld</span>
                <span><span className="inline-block h-2 w-2 rounded-full" style={{ background: "#059669" }} /> kumulierte Tilgung</span>
              </div>
            </div>
          </div>
        </Section>

        <Section no="5" title="Stresstest — Oikos Resilienz-Analyse">
          <div className="grid gap-6 sm:grid-cols-5">
            <div className="sm:col-span-3">
              <StressBars
                items={stress.map((s) => ({
                  label: s.label,
                  value: Math.min(3, s.dscr),
                  color: s.dscr >= 1.25 ? "#059669" : s.dscr >= 1.1 ? "#f59e0b" : "#e11d48"
                }))}
                refLines={[
                  { y: 1.25, label: "1,25 bankfähig", color: "#059669" },
                  { y: 1.1, label: "1,10 Minimum", color: "#e11d48" }
                ]}
                yMax={3}
              />
            </div>
            <div className="sm:col-span-2">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Cashflow n. St. je Szenario</div>
              {stress.map((s) => (
                <div key={s.label} className="flex items-center justify-between border-b border-zinc-100 py-1 text-sm">
                  <span className="text-zinc-600">{s.label}</span>
                  <span className={`font-medium ${s.cashflowAfterTax >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    {eur(Math.round(s.cashflowAfterTax))}/M
                  </span>
                </div>
              ))}
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                Zeigt, wie robust der Deal auf Zinsanstieg, Leerstand und Mietrückgang
                reagiert — die Kennzahl für nachhaltige Tragfähigkeit.
              </p>
            </div>
          </div>
        </Section>

        <Section no="6" title="Vermögensaufbau-Projektion">
          <div className="grid gap-6 sm:grid-cols-5">
            <div className="sm:col-span-3">
              <AreaChart
                series={[
                  { points: wealth.map((w) => w.value), color: "#0d9488", label: "Immobilienwert" },
                  { points: wealth.map((w) => w.equity), color: "#059669", fill: "#a7f3d0", label: "Vermögen (EK)" }
                ]}
                xLabels={wealth.map((w) => (w.year % 3 === 0 ? `${w.year}J` : ""))}
              />
              <div className="flex gap-4 text-[11px] text-zinc-500">
                <span><span className="inline-block h-2 w-2 rounded-full" style={{ background: "#0d9488" }} /> Immobilienwert</span>
                <span><span className="inline-block h-2 w-2 rounded-full" style={{ background: "#059669" }} /> Vermögen (Wert − Restschuld)</span>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Row label="Eingesetztes Eigenkapital" value={eur(fa.equity)} />
              <Row label="Vermögen heute (Wert − Schuld)" value={eur(p.price - fa.loan)} />
              {wealth10 ? <Row label="Vermögen nach 10 Jahren" value={eur(wealth10.equity)} /> : null}
              {wealth10 ? <Row label="Vermögenszuwachs (10 J.)" value={eur(wealth10.equity - (p.price - fa.loan))} /> : null}
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
                Annahme Wertsteigerung {pct(APPRECIATION * 100)} p. a. Vermögen = Immobilienwert
                abzüglich Restschuld; steigt durch Tilgung und Wertentwicklung.
              </p>
            </div>
          </div>
        </Section>

        {readiness ? (
          <Section no="7" title="Bankfähigkeits-Einschätzung" pageBreak>
            <div className="mb-3 flex items-center gap-2">
              <MiniAmpel light={readiness.overall} />
              <span className="text-sm font-semibold text-zinc-900">{readiness.overallLabel}</span>
              <span className="text-xs text-zinc-500">(Score {readiness.readinessScore}/100)</span>
            </div>
            <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
              {readiness.criteria.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-3 border-b border-zinc-100 py-1.5">
                  <span className="flex items-center gap-2 text-sm text-zinc-700">
                    <span className={`inline-block h-2 w-2 rounded-full ${DOT[c.light]}`} />
                    {c.label}
                  </span>
                  <span className="text-sm font-medium text-zinc-900">{c.value}</span>
                </div>
              ))}
            </div>
            {readiness.checklist.length > 0 ? (
              <div className="mt-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Unterlagen-Status</div>
                <div className="grid gap-x-8 gap-y-0.5 text-sm sm:grid-cols-2">
                  {readiness.checklist.map((it) => (
                    <div key={it.label} className="flex items-center gap-2 py-0.5 text-zinc-700">
                      <span className="w-3 text-center font-semibold">
                        {it.status === "done" ? (
                          <span className="text-emerald-600">✓</span>
                        ) : it.status === "missing" ? (
                          <span className="text-amber-600">✗</span>
                        ) : (
                          <span className="text-zinc-400">○</span>
                        )}
                      </span>
                      <span>{it.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Section>
        ) : null}

        <Section no="8" title="Investor-Profil & Selbstauskunft">
          {profile ? (
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <Row label="Eigenkapital" value={eur(profile.equity ?? null)} />
                <Row label="Nettoeinkommen / Monat" value={eur(profile.monthlyIncome ?? null)} />
                <Row label="Laufende Verbindlichkeiten" value={eur(profile.monthlyDebt ?? null)} />
                <Row label="Max. Darlehen (Faustformel)" value={eur(profile.affordability.maxLoan)} />
                <Row label="Finanzierungs-Vorabzusage" value={profile.financingPreApproved ? "Ja" : "Nein"} />
                <Row label="Investment-Erfahrung" value={`${profile.investmentExperienceYears} Jahre`} />
              </div>
              <div>
                {profile.bio ? <div className="mb-3 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">{profile.bio}</div> : null}
                {profile.trackrecord.length > 0 ? (
                  <>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Trackrecord ({profile.trackrecord.length})
                    </div>
                    <div className="space-y-1">
                      {profile.trackrecord.slice(0, 4).map((t) => (
                        <div key={t.id} className="flex items-center justify-between border-b border-zinc-100 py-1 text-sm">
                          <span className="text-zinc-700">{t.year} · {t.location}</span>
                          <span className="text-zinc-500">{t.value != null ? eur(t.value) : t.type}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-zinc-500">Kein Trackrecord hinterlegt.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-500">Kein Investor-Profil hinterlegt.</div>
          )}
        </Section>

        <div className="mt-8 border-t-2 border-emerald-600 pt-3">
          <p className="text-[10px] leading-relaxed text-zinc-400">
            Erstellt mit Infinity Oikos · Capital Layer am {today}. Diese Finanzierungsmappe ist
            eine organisatorische Aufbereitung der im System vorhandenen Daten und stellt eine
            Selbsteinschätzung der allgemeinen Bankfähigkeit dar — keine Finanzierungsberatung und
            keine Empfehlung eines konkreten Kreditprodukts. Berechnungen beruhen auf den
            angegebenen Annahmen (u. a. Wertsteigerung {pct(APPRECIATION * 100)} p. a.) und dienen
            der Orientierung. Die konkrete Prüfung und Vermittlung erfolgt durch einen
            Finanzierungspartner. Angaben ohne Gewähr.
          </p>
        </div>

        <div id="print-footer">Infinity Oikos · Capital Layer — {p.title} · Stand {today}</div>
      </div>
    </div>
  );
}
