// Finanzierungsmappe v2 — Rechen-Engine (proprietäre Oikos-Kennzahlen).
// Spiegelt backend/src/lib/calc.ts, ergänzt um Tilgungsplan, Stresstest,
// Vermögensaufbau-Projektion und Eigenkapitalrendite/Leverage. Reine
// Aufbereitung — keine Finanzierungsberatung.

export type Assumptions = {
  equityRatio: number;
  loanInterestRate: number;
  loanRepaymentRate: number;
  taxRateIncome: number;
  closingCostsRate: number;
  maintenanceRate: number;
  vacancyRate: number;
  buildingShare: number;
  afaRate: number;
};

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  equityRatio: 0.2,
  loanInterestRate: 0.038,
  loanRepaymentRate: 0.02,
  taxRateIncome: 0.42,
  closingCostsRate: 0.1,
  maintenanceRate: 0.3,
  vacancyRate: 0.05,
  buildingShare: 0.8,
  afaRate: 0.02
};

export type FullAnalysis = {
  closingCosts: number;
  totalInvestment: number;
  equity: number;
  loan: number;
  monthlyInterest: number;
  monthlyRepayment: number;
  monthlyAfA: number;
  monthlyMaintenance: number;
  monthlyVacancyLoss: number;
  effectiveRent: number;
  noiMonthly: number; // Netto-Mietertrag (vor Kapitaldienst)
  grossYield: number;
  netYield: number;
  cashflow: number;
  cashflowAfterTax: number;
};

// 1:1 zu calc.ts computeFullAnalysis (gleiche Zahlen wie im Rest der App).
export function fullAnalysis(price: number, rent: number, a: Assumptions): FullAnalysis {
  const closingCosts = price * a.closingCostsRate;
  const totalInvestment = price + closingCosts;
  const equity = totalInvestment * a.equityRatio;
  const loan = totalInvestment - equity;

  const monthlyInterest = (loan * a.loanInterestRate) / 12;
  const monthlyRepayment = (loan * a.loanRepaymentRate) / 12;
  const buildingValue = price * a.buildingShare;
  const monthlyAfA = (buildingValue * a.afaRate) / 12;
  const monthlyMaintenance = rent * a.maintenanceRate;
  const monthlyVacancyLoss = rent * a.vacancyRate;

  const effectiveRent = rent - monthlyVacancyLoss;
  const noiMonthly = effectiveRent - monthlyMaintenance;
  const cashflow = effectiveRent - monthlyMaintenance - monthlyInterest - monthlyRepayment;
  const taxableMonthly = effectiveRent - monthlyMaintenance - monthlyInterest - monthlyAfA;
  const monthlyTax = taxableMonthly * a.taxRateIncome;
  const cashflowAfterTax = cashflow - monthlyTax;

  const grossYield = price > 0 ? ((rent * 12) / price) * 100 : 0;
  const annualNetRent = noiMonthly * 12;
  const netYield = totalInvestment > 0 ? (annualNetRent / totalInvestment) * 100 : 0;

  return {
    closingCosts,
    totalInvestment,
    equity,
    loan,
    monthlyInterest,
    monthlyRepayment,
    monthlyAfA,
    monthlyMaintenance,
    monthlyVacancyLoss,
    effectiveRent,
    noiMonthly,
    grossYield,
    netYield,
    cashflow,
    cashflowAfterTax
  };
}

export function dscr(noiMonthly: number, debtServiceMonthly: number): number {
  if (debtServiceMonthly <= 0) return Infinity;
  return noiMonthly / debtServiceMonthly;
}

// --- Tilgungsplan (Annuität: Zins + anfängliche Tilgung) -------------
export type AmortYear = {
  year: number;
  zins: number;
  tilgung: number;
  restschuld: number;
  kumTilgung: number;
};

export function amortization(
  loan: number,
  interestRate: number,
  repaymentRate: number,
  years: number
): AmortYear[] {
  const annuity = loan * (interestRate + repaymentRate);
  const out: AmortYear[] = [];
  let rest = loan;
  let kum = 0;
  for (let y = 1; y <= years; y++) {
    const zins = rest * interestRate;
    let tilgung = annuity - zins;
    if (tilgung > rest) tilgung = rest;
    rest = Math.max(0, rest - tilgung);
    kum += tilgung;
    out.push({ year: y, zins, tilgung, restschuld: rest, kumTilgung: kum });
    if (rest <= 0) break;
  }
  return out;
}

// --- Stresstest (proprietär) ----------------------------------------
export type StressScenario = {
  label: string;
  dscr: number;
  cashflowAfterTax: number;
};

export function stressTest(price: number, rent: number, base: Assumptions): StressScenario[] {
  const scen = (label: string, a: Assumptions, r: number): StressScenario => {
    const fa = fullAnalysis(price, r, a);
    return {
      label,
      dscr: dscr(fa.noiMonthly, fa.monthlyInterest + fa.monthlyRepayment),
      cashflowAfterTax: fa.cashflowAfterTax
    };
  };
  return [
    scen("Basis", base, rent),
    scen("Zins +1 %", { ...base, loanInterestRate: base.loanInterestRate + 0.01 }, rent),
    scen("Zins +2 %", { ...base, loanInterestRate: base.loanInterestRate + 0.02 }, rent),
    scen("Leerstand +5 PP", { ...base, vacancyRate: base.vacancyRate + 0.05 }, rent),
    scen("Miete −10 %", base, rent * 0.9)
  ];
}

// --- Vermögensaufbau-Projektion (proprietär) ------------------------
// Vermögen = Immobilienwert (mit Wertsteigerung) − Restschuld.
export type WealthYear = {
  year: number;
  value: number;
  restschuld: number;
  equity: number;
};

export function wealthProjection(
  price: number,
  loan: number,
  interestRate: number,
  repaymentRate: number,
  appreciation: number,
  years: number
): WealthYear[] {
  const amort = amortization(loan, interestRate, repaymentRate, years);
  const restAt = (y: number) => {
    if (y <= 0) return loan;
    const row = amort.find((r) => r.year === y);
    if (row) return row.restschuld;
    return 0; // bereits getilgt
  };
  const out: WealthYear[] = [];
  for (let y = 0; y <= years; y++) {
    const value = price * Math.pow(1 + appreciation, y);
    const restschuld = restAt(y);
    out.push({ year: y, value, restschuld, equity: value - restschuld });
  }
  return out;
}

// --- Eigenkapitalrendite / Leverage ---------------------------------
export type ReturnMetrics = {
  cashOnCash: number; // jährl. Cashflow n. St. / EK (%)
  totalRoe: number; // (Cashflow n. St. + Tilgung Jahr 1) / EK (%)
  leverageGain: number; // totalRoe − Nettorendite (Hebelwirkung in PP)
};

export function returnMetrics(fa: FullAnalysis, netYield: number): ReturnMetrics {
  const annualCfAfterTax = fa.cashflowAfterTax * 12;
  const annualTilgung = fa.monthlyRepayment * 12;
  const cashOnCash = fa.equity > 0 ? (annualCfAfterTax / fa.equity) * 100 : 0;
  const totalRoe = fa.equity > 0 ? ((annualCfAfterTax + annualTilgung) / fa.equity) * 100 : 0;
  return { cashOnCash, totalRoe, leverageGain: totalRoe - netYield };
}
