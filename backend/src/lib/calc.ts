export function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function computeGrossYield(price: number, rentMonthly: number) {
  if (price <= 0) return 0;
  const annualRent = rentMonthly * 12;
  return (annualRent / price) * 100;
}

// Vereinfachte Formel: Miete - 30% Instandhaltung/Leerstand - 2% Finanzierungskosten p.a. vom Kaufpreis / 12
export function computeCashflow(price: number, rentMonthly: number) {
  const maintenance = rentMonthly * 0.3;
  const financing = (price * 0.02) / 12;
  return rentMonthly - maintenance - financing;
}

export function computeScore(grossYieldPct: number, cashflowMonthly: number) {
  // Heuristik für MVP: Rendite bis 8% -> 0..60, Cashflow bis 300€ -> 0..40
  const yieldComponent = clampInt((grossYieldPct / 8) * 60, 0, 60);
  const cashflowComponent = clampInt((cashflowMonthly / 300) * 40, 0, 40);
  return clampInt(yieldComponent + cashflowComponent, 0, 100);
}

