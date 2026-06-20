// =====================================================================
// Phase N — Oikos Capital Layer, Schritt 1: Financing Readiness Score
//
// Beantwortet die Frage "Ist dieser Investor mit diesem Deal heute
// bankfähig?" als Ampel (GREEN / YELLOW / RED) mit Einzelkriterien
// und konkreten Maßnahmen.
//
// WICHTIG (Regulatorik): Das ist eine SELBSTEINSCHÄTZUNG der allgemeinen
// Bankfähigkeit aus den im System vorhandenen Daten — KEINE Finanzierungs-
// beratung und keine Empfehlung eines konkreten Kreditprodukts. Damit
// bleibt das Modul im erlaubnisfreien Bereich (kein § 34i/§ 34c GewO).
//
// Bewusst OHNE eigene DB-Tabelle: live aus Property + InvestorProfile +
// letzter Analyse berechnet (additiv, migrationsfrei).
// =====================================================================

import {
  computeFullAnalysis,
  DEFAULT_ASSUMPTIONS,
  type AnalysisAssumptions,
  clampInt
} from "./calc.js";

export type Light = "GREEN" | "YELLOW" | "RED";

export type ReadinessCriterion = {
  key:
    | "equity"
    | "dscr"
    | "creditworthiness"
    | "ltv"
    | "objectScore";
  label: string;
  light: Light;
  value: string; // menschenlesbarer Ist-Wert (z. B. "18,5 %")
  detail: string; // kurze Erklärung der Schwelle
  // Optional: konkrete Maßnahme, wenn nicht GREEN
  measure?: string;
};

export type FinancingReadinessResult = {
  overall: Light;
  overallLabel: string;
  // 0..100 grobe Gesamt-Reife (gewichtet) — nur zur Anzeige, nicht aufsichtsrechtlich
  readinessScore: number;
  criteria: ReadinessCriterion[];
  measures: string[];
  basis: {
    usedStoredAnalysis: boolean;
    scenarioName: string | null;
    price: number;
    rent: number;
    hasProfile: boolean;
  };
  disclaimer: string;
};

// Eckdaten, die wir entweder aus einer gespeicherten Analyse oder aus
// einer frisch berechneten Standard-Analyse beziehen.
type Metrics = {
  closingCosts: number;
  totalInvestment: number;
  loan: number;
  monthlyInterest: number;
  monthlyRepayment: number;
  monthlyMaintenance: number;
  monthlyVacancyLoss: number;
  score: number;
};

export type ProfileInput = {
  equity: number | null;
  monthlyIncome: number | null;
  monthlyDebt: number | null;
  financingPreApproved: boolean;
} | null;

const DISCLAIMER =
  "Selbsteinschätzung der allgemeinen Bankfähigkeit aus euren Daten — " +
  "keine Finanzierungsberatung und keine Empfehlung eines konkreten " +
  "Kreditprodukts. Die konkrete Prüfung erfolgt durch einen Finanzierungspartner.";

function eur(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(Math.round(n));
}

function pct(ratio: number): string {
  return `${(ratio * 100).toFixed(1).replace(".", ",")} %`;
}

// Wahl der schlechtesten Ampel aus einer Liste.
function worst(lights: Light[]): Light {
  if (lights.includes("RED")) return "RED";
  if (lights.includes("YELLOW")) return "YELLOW";
  return "GREEN";
}

// Affordability-Faustformel (analog computeAffordability im Backend):
// 40 % Netto-Einkommen minus laufende Verbindlichkeiten als max. Kapitaldienst,
// daraus per Annuität (5,8 % p. a.) das maximale Darlehen.
function maxLoanFromIncome(
  monthlyIncome: number | null,
  monthlyDebt: number | null
): number | null {
  if (monthlyIncome == null) return null;
  const debtCap = monthlyIncome * 0.4;
  const maxDebtService = Math.max(0, debtCap - (monthlyDebt ?? 0));
  const annuityFactorMonthly = 0.058 / 12;
  return Math.round(maxDebtService / annuityFactorMonthly);
}

/**
 * Hauptfunktion. Berechnet die Financing-Readiness-Ampel.
 *
 * @param price   Kaufpreis (EUR)
 * @param rent    Monatliche Ist-Miete (EUR)
 * @param profile Investor-Bonität (kann null sein, wenn kein Profil)
 * @param stored  Optional: gespeicherte letzte Analyse (Snapshot-Felder)
 */
export function computeFinancingReadiness(
  price: number,
  rent: number,
  profile: ProfileInput,
  stored?: Partial<Metrics> & { scenarioName?: string | null }
): FinancingReadinessResult {
  // 1) Metriken bestimmen — gespeicherte Analyse bevorzugen, sonst Standard.
  const hasStored =
    stored != null &&
    stored.loan != null &&
    stored.monthlyInterest != null &&
    stored.monthlyRepayment != null;

  let metrics: Metrics;
  let usedStoredAnalysis = false;
  let scenarioName: string | null = null;

  if (hasStored) {
    usedStoredAnalysis = true;
    scenarioName = stored!.scenarioName ?? null;
    metrics = {
      closingCosts: stored!.closingCosts ?? price * DEFAULT_ASSUMPTIONS.closingCostsRate,
      totalInvestment:
        stored!.totalInvestment ?? price * (1 + DEFAULT_ASSUMPTIONS.closingCostsRate),
      loan: stored!.loan!,
      monthlyInterest: stored!.monthlyInterest!,
      monthlyRepayment: stored!.monthlyRepayment!,
      monthlyMaintenance:
        stored!.monthlyMaintenance ?? rent * DEFAULT_ASSUMPTIONS.maintenanceRate,
      monthlyVacancyLoss:
        stored!.monthlyVacancyLoss ?? rent * DEFAULT_ASSUMPTIONS.vacancyRate,
      score: stored!.score ?? 0
    };
  } else {
    // Standard-Analyse. Wenn Eigenkapital bekannt ist, leiten wir die
    // EK-Quote daraus ab (realistischer als die 20 %-Default).
    const assumptions: AnalysisAssumptions = { ...DEFAULT_ASSUMPTIONS };
    const totalInvestmentDefault = price * (1 + DEFAULT_ASSUMPTIONS.closingCostsRate);
    if (profile?.equity != null && totalInvestmentDefault > 0) {
      assumptions.equityRatio = clampRatio(profile.equity / totalInvestmentDefault, 0.05, 0.95);
    }
    const a = computeFullAnalysis(price, rent, assumptions);
    metrics = {
      closingCosts: a.closingCosts,
      totalInvestment: a.totalInvestment,
      loan: a.loan,
      monthlyInterest: a.monthlyInterest,
      monthlyRepayment: a.monthlyRepayment,
      monthlyMaintenance: a.monthlyMaintenance,
      monthlyVacancyLoss: a.monthlyVacancyLoss,
      score: a.score
    };
  }

  const criteria: ReadinessCriterion[] = [];

  // --- Kriterium 1: Eigenkapital -------------------------------------
  {
    const equity = profile?.equity ?? null;
    const ekQuote = metrics.totalInvestment > 0 && equity != null
      ? equity / metrics.totalInvestment
      : null;
    let light: Light;
    let measure: string | undefined;
    if (equity == null) {
      light = "RED";
      measure = "Eigenkapital im Investor-Profil hinterlegen, damit die Bankfähigkeit bewertbar ist.";
    } else if (ekQuote! >= 0.2 && equity >= metrics.closingCosts) {
      light = "GREEN";
    } else if (ekQuote! >= 0.1) {
      light = "YELLOW";
      const needed = Math.max(0, Math.round(metrics.totalInvestment * 0.2 - equity));
      measure = `Eigenkapital um ca. ${eur(needed)} erhöhen, um die 20-%-Schwelle zu erreichen.`;
    } else {
      light = "RED";
      const needed = Math.max(0, Math.round(metrics.totalInvestment * 0.2 - equity));
      measure = `Eigenkapital deutlich zu niedrig (< 10 %). Ca. ${eur(needed)} bis zur 20-%-Schwelle.`;
    }
    criteria.push({
      key: "equity",
      label: "Eigenkapitalquote",
      light,
      value: ekQuote != null ? pct(ekQuote) : "—",
      detail: "Grün ab 20 % (inkl. Kaufnebenkosten), Gelb 10–20 %, Rot < 10 %.",
      measure
    });
  }

  // --- Kriterium 2: Kapitaldienstdeckung (DSCR) ----------------------
  {
    const noi = rent - metrics.monthlyVacancyLoss - metrics.monthlyMaintenance;
    const debtService = metrics.monthlyInterest + metrics.monthlyRepayment;
    const dscr = debtService > 0 ? noi / debtService : Infinity;
    let light: Light;
    let measure: string | undefined;
    if (dscr >= 1.25) {
      light = "GREEN";
    } else if (dscr >= 1.1) {
      light = "YELLOW";
      measure = "Kapitaldienstdeckung knapp (< 1,25): mehr Eigenkapital oder längere Zinsbindung/Tilgungsstruktur prüfen.";
    } else {
      light = "RED";
      measure = "Kapitaldienstdeckung zu niedrig (< 1,10): Mieteinnahmen decken den Kapitaldienst kaum. Kaufpreis/Finanzierung anpassen.";
    }
    criteria.push({
      key: "dscr",
      label: "Kapitaldienstdeckung (DSCR)",
      light,
      value: Number.isFinite(dscr) ? dscr.toFixed(2).replace(".", ",") : "∞",
      detail: "Netto-Mietertrag / Kapitaldienst. Grün ≥ 1,25, Gelb 1,10–1,25, Rot < 1,10.",
      measure
    });
  }

  // --- Kriterium 3: Bonität / Selbstauskunft ------------------------
  {
    const income = profile?.monthlyIncome ?? null;
    const equity = profile?.equity ?? null;
    const preApproved = profile?.financingPreApproved ?? false;
    const maxLoan = maxLoanFromIncome(income, profile?.monthlyDebt ?? null);
    const incomeCovers = maxLoan != null && maxLoan >= metrics.loan;

    let light: Light;
    let measure: string | undefined;
    if (income == null) {
      light = "RED";
      measure = "Selbstauskunft unvollständig: Netto-Einkommen im Investor-Profil ergänzen.";
    } else if ((preApproved || incomeCovers) && equity != null) {
      light = "GREEN";
    } else {
      light = "YELLOW";
      if (equity == null) {
        measure = "Selbstauskunft vervollständigen (Eigenkapital ergänzen).";
      } else if (!incomeCovers && !preApproved) {
        measure = "Tragfähigkeit ggü. Einkommen knapp: Bank-Vorabzusage einholen oder Darlehensbedarf senken.";
      } else {
        measure = "Selbstauskunft fast vollständig — Bank-Vorabzusage stärkt die Position.";
      }
    }
    const detailParts: string[] = [];
    if (maxLoan != null) detailParts.push(`max. Darlehen ggü. Einkommen ca. ${eur(maxLoan)}`);
    detailParts.push(preApproved ? "Vorabzusage: ja" : "Vorabzusage: nein");
    criteria.push({
      key: "creditworthiness",
      label: "Bonität / Selbstauskunft",
      light,
      value: income != null ? `${eur(income)}/Mon. Netto` : "—",
      detail: detailParts.join(" · "),
      measure
    });
  }

  // --- Kriterium 4: Beleihungsauslauf (LTV) --------------------------
  {
    const ltv = price > 0 ? metrics.loan / price : null;
    let light: Light;
    let measure: string | undefined;
    if (ltv == null) {
      light = "YELLOW";
    } else if (ltv <= 0.8) {
      light = "GREEN";
    } else if (ltv <= 0.9) {
      light = "YELLOW";
      measure = "Beleihungsauslauf 80–90 %: mehr Eigenkapital senkt Zins und erhöht die Zusagewahrscheinlichkeit.";
    } else {
      light = "RED";
      measure = "Beleihungsauslauf > 90 %: viele Häuser finanzieren das nicht. Eigenkapital erhöhen.";
    }
    criteria.push({
      key: "ltv",
      label: "Beleihungsauslauf (LTV)",
      light,
      value: ltv != null ? pct(ltv) : "—",
      detail: "Darlehen / Kaufpreis. Grün ≤ 80 %, Gelb 80–90 %, Rot > 90 %.",
      measure
    });
  }

  // --- Kriterium 5: Objekt-Score (IRS-Proxy) -------------------------
  {
    const score = metrics.score;
    let light: Light;
    let measure: string | undefined;
    if (score >= 70) {
      light = "GREEN";
    } else if (score >= 55) {
      light = "YELLOW";
      measure = "Objekt-Score mittel: Kaufpreis nachverhandeln oder Miet-/Vermietungspotenzial heben.";
    } else {
      light = "RED";
      measure = "Objekt-Score niedrig: Rendite/Cashflow schwach — Kaufpreis kritisch prüfen.";
    }
    criteria.push({
      key: "objectScore",
      label: "Objekt-Score",
      light,
      value: `${score} / 100`,
      detail: "Rendite-/Cashflow-Score der Analyse. Grün ≥ 70, Gelb 55–69, Rot < 55.",
      measure
    });
  }

  // --- Gesamt-Ampel --------------------------------------------------
  // Kern-Kriterien (EK, DSCR, Bonität, LTV) entscheiden über ROT.
  const core: Light[] = [
    criteria.find((c) => c.key === "equity")!.light,
    criteria.find((c) => c.key === "dscr")!.light,
    criteria.find((c) => c.key === "creditworthiness")!.light,
    criteria.find((c) => c.key === "ltv")!.light
  ];
  let overall: Light;
  if (core.includes("RED")) {
    overall = "RED";
  } else {
    overall = worst(criteria.map((c) => c.light));
  }

  const overallLabel =
    overall === "GREEN"
      ? "Bankfähig"
      : overall === "YELLOW"
        ? "Finanzierbar mit Optimierung"
        : "Noch nicht bankfähig";

  // Grobe 0..100-Reife: GREEN=100, YELLOW=60, RED=20 je Kriterium, Mittelwert.
  const perLight = (l: Light) => (l === "GREEN" ? 100 : l === "YELLOW" ? 60 : 20);
  const readinessScore = clampInt(
    criteria.reduce((s, c) => s + perLight(c.light), 0) / criteria.length,
    0,
    100
  );

  const measures = criteria
    .filter((c) => c.measure && c.light !== "GREEN")
    .map((c) => c.measure!) as string[];

  return {
    overall,
    overallLabel,
    readinessScore,
    criteria,
    measures,
    basis: {
      usedStoredAnalysis,
      scenarioName,
      price,
      rent,
      hasProfile: profile != null
    },
    disclaimer: DISCLAIMER
  };
}

// Lokaler Ratio-Clamp (calc.ts exportiert nur clampInt für Ganzzahlen).
function clampRatio(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
