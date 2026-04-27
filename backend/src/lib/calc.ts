export function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

// --- Einfache MVP-Heuristik (wird im neuen Endpoint nicht mehr genutzt,
// bleibt für Abwärtskompatibilität) -------------------------------------

export function computeGrossYield(price: number, rentMonthly: number) {
  if (price <= 0) return 0;
  const annualRent = rentMonthly * 12;
  return (annualRent / price) * 100;
}

export function computeCashflow(price: number, rentMonthly: number) {
  const maintenance = rentMonthly * 0.3;
  const financing = (price * 0.02) / 12;
  return rentMonthly - maintenance - financing;
}

export function computeScore(grossYieldPct: number, cashflowMonthly: number) {
  const yieldComponent = clampInt((grossYieldPct / 8) * 60, 0, 60);
  const cashflowComponent = clampInt((cashflowMonthly / 300) * 40, 0, 40);
  return clampInt(yieldComponent + cashflowComponent, 0, 100);
}

// --- Vollständige Analyse mit Finanzierung + Steuer (Block B) ----------

export type AnalysisAssumptions = {
  equityRatio: number;       // 0..1, Anteil Eigenkapital am Gesamtinvest
  loanInterestRate: number;  // p.a., z.B. 0.038
  loanRepaymentRate: number; // p.a., z.B. 0.02
  taxRateIncome: number;     // 0..1, persönlicher Grenzsteuersatz
  closingCostsRate: number;  // 0..1, Kaufnebenkosten als Anteil vom Kaufpreis
  maintenanceRate: number;   // 0..1, Instandhaltung als Anteil der Miete
  vacancyRate: number;       // 0..1, Leerstand als Anteil der Miete
  buildingShare: number;     // 0..1, Gebäudeanteil am Kaufpreis (Rest = Boden)
  afaRate: number;           // p.a., AfA-Satz auf Gebäudewert
};

export const DEFAULT_ASSUMPTIONS: AnalysisAssumptions = {
  equityRatio: 0.20,
  loanInterestRate: 0.038,
  loanRepaymentRate: 0.02,
  taxRateIncome: 0.42,
  closingCostsRate: 0.10, // typisch DE: GrESt 3.5–6.5 % + Notar ~1.5 % + Makler bis 3.57 %
  maintenanceRate: 0.30,
  vacancyRate: 0.05,
  buildingShare: 0.80,
  afaRate: 0.02
};

export type AnalysisResult = {
  closingCosts: number;
  totalInvestment: number;
  equity: number;
  loan: number;
  monthlyInterest: number;
  monthlyRepayment: number;
  monthlyAfA: number;
  monthlyMaintenance: number;
  monthlyVacancyLoss: number;
  grossYield: number;
  netYield: number;
  cashflow: number;
  cashflowAfterTax: number;
  score: number;
};

export function computeFullAnalysis(
  price: number,
  rentMonthly: number,
  assumptions: AnalysisAssumptions = DEFAULT_ASSUMPTIONS
): AnalysisResult {
  const a = assumptions;

  const closingCosts = price * a.closingCostsRate;
  const totalInvestment = price + closingCosts;
  const equity = totalInvestment * a.equityRatio;
  const loan = totalInvestment - equity;

  const monthlyInterest = (loan * a.loanInterestRate) / 12;
  const monthlyRepayment = (loan * a.loanRepaymentRate) / 12;

  const buildingValue = price * a.buildingShare;
  const monthlyAfA = (buildingValue * a.afaRate) / 12;

  const monthlyMaintenance = rentMonthly * a.maintenanceRate;
  const monthlyVacancyLoss = rentMonthly * a.vacancyRate;

  // Effektive Miete nach Leerstand
  const effectiveRent = rentMonthly - monthlyVacancyLoss;

  // Cashflow vor Steuer (Tilgung ist Geldfluss, geht ab)
  const cashflow =
    effectiveRent - monthlyMaintenance - monthlyInterest - monthlyRepayment;

  // Steuerliches Ergebnis: Tilgung NICHT abzugsfähig, AfA dafür schon.
  // Bei negativem Ergebnis: Verluste werden mit anderen Einkünften verrechnet
  // → negative Steuer = Steuerersparnis. Setzt voraus, dass der Investor
  // ausreichend andere positive Einkünfte hat (sonst wäre der 42%-Annahme
  // ohnehin nicht stimmig).
  const taxableMonthly =
    effectiveRent - monthlyMaintenance - monthlyInterest - monthlyAfA;
  const monthlyTax = taxableMonthly * a.taxRateIncome;

  const cashflowAfterTax = cashflow - monthlyTax;

  // Renditen
  const grossYield = price > 0 ? ((rentMonthly * 12) / price) * 100 : 0;
  const annualNetRent = (effectiveRent - monthlyMaintenance) * 12;
  const netYield = totalInvestment > 0 ? (annualNetRent / totalInvestment) * 100 : 0;

  // Score: Nettorendite (max 5 % → 50 Punkte) + Cashflow nach Steuer (max 200 €/Mon. → 50 Punkte)
  const yieldComp = clampInt((netYield / 5) * 50, 0, 50);
  const cashflowComp = clampInt((cashflowAfterTax / 200) * 50, 0, 50);
  const score = clampInt(yieldComp + cashflowComp, 0, 100);

  return {
    closingCosts: Math.round(closingCosts),
    totalInvestment: Math.round(totalInvestment),
    equity: Math.round(equity),
    loan: Math.round(loan),
    monthlyInterest,
    monthlyRepayment,
    monthlyAfA,
    monthlyMaintenance,
    monthlyVacancyLoss,
    grossYield,
    netYield,
    cashflow,
    cashflowAfterTax,
    score
  };
}
