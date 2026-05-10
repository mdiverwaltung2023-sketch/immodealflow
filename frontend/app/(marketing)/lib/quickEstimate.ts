/**
 * Phase L10 — Lokale Schnell-Schätzung für die Landing-Page.
 *
 * Bewusst simpel + transparent: pro Stadt ein €/m²-Basiswert, plus
 * Faktor je Asset-Typ und Baujahr-Cluster. Kein KI-Aufruf — die LP
 * soll in <1 Sek antworten und ohne Backend funktionieren.
 *
 * Nicht für echte Bewertungen verwenden — die Vollanalyse läuft
 * im eingeloggten Bereich über computeFullAnalysis (Block B) +
 * Claude Tool-Use.
 */

export type AssetType = "MFH" | "ETW" | "GEWERBE";

const CITY_BASE_KAUFPREIS_PER_QM: Record<string, number> = {
  // Top-Städte mit groben Ø-Kaufpreisen €/m² (Stand 2026-Q1, gerundet)
  Berlin: 4800,
  Hamburg: 5200,
  München: 8200,
  Köln: 4400,
  Frankfurt: 5800,
  Stuttgart: 5400,
  Düsseldorf: 4900,
  Leipzig: 2600,
  Dresden: 2800,
  Hannover: 3200,
  Nürnberg: 3500,
  Bremen: 3000,
  Essen: 2400,
  Dortmund: 2300,
  Bonn: 4100,
  Freiburg: 5100,
  Mannheim: 3400,
  Wiesbaden: 4600,
  Karlsruhe: 4000,
  Mainz: 4200,
  Augsburg: 3900,
  Münster: 3800,
  Aachen: 3300,
  Heidelberg: 5200,
  Regensburg: 4400,
  Potsdam: 4600,
  Lübeck: 3000
};

const CITY_BASE_MIETE_PER_QM: Record<string, number> = {
  // Ø Kaltmiete in €/m² (gerundet)
  Berlin: 13.5,
  Hamburg: 14.0,
  München: 21.0,
  Köln: 13.0,
  Frankfurt: 16.0,
  Stuttgart: 15.5,
  Düsseldorf: 13.5,
  Leipzig: 8.5,
  Dresden: 9.5,
  Hannover: 10.5,
  Nürnberg: 11.5,
  Bremen: 9.5,
  Essen: 8.5,
  Dortmund: 8.0,
  Bonn: 12.5,
  Freiburg: 14.0,
  Mannheim: 11.0,
  Wiesbaden: 13.0,
  Karlsruhe: 12.5,
  Mainz: 13.5,
  Augsburg: 12.5,
  Münster: 12.5,
  Aachen: 10.5,
  Heidelberg: 14.5,
  Regensburg: 13.5,
  Potsdam: 13.0,
  Lübeck: 9.0
};

const FALLBACK_KAUFPREIS = 2800;
const FALLBACK_MIETE = 9.0;

const ASSET_TYPE_FACTOR: Record<AssetType, number> = {
  MFH: 0.95, // Mehrfamilienhaus — pro m² etwas günstiger als ETW
  ETW: 1.1, // Eigentumswohnung — Premium pro m²
  GEWERBE: 0.85 // Gewerbe — höhere Schwankung, im Schnitt darunter
};

function yearFactor(yearBuilt: number): number {
  if (yearBuilt < 1950) return 0.82;
  if (yearBuilt < 1980) return 0.92;
  if (yearBuilt < 2000) return 1.0;
  if (yearBuilt < 2015) return 1.08;
  return 1.18;
}

function eur(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

function eur2(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2
  }).format(n);
}

export type QuickEstimateInput = {
  city: string;
  assetType: AssetType;
  area: number;
  yearBuilt: number;
};

export type QuickEstimateOutput = {
  /** Mittlerer Marktwert (€) */
  marketValue: number;
  /** Untergrenze (-12 %) */
  marketValueLow: number;
  /** Obergrenze (+12 %) */
  marketValueHigh: number;
  /** Geschätzte Kaltmiete €/m² */
  rentPerQm: number;
  /** Monatliche Sollmiete (€) */
  monthlyRent: number;
  /** Mietmultiplikator (Marktwert / Jahres-Sollmiete) */
  rentMultiplier: number;
  /** Bruttoanfangsrendite (%) */
  grossYield: number;
  /** Wurde die Stadt gefunden, oder nutzen wir Fallback? */
  cityRecognized: boolean;
  formatted: {
    marketValue: string;
    marketValueLow: string;
    marketValueHigh: string;
    rentPerQm: string;
    monthlyRent: string;
    rentMultiplier: string;
    grossYield: string;
  };
};

function lookupCity<T>(map: Record<string, T>, city: string, fallback: T): { val: T; recognized: boolean } {
  const trimmed = city.trim();
  if (!trimmed) return { val: fallback, recognized: false };
  // exakter Hit
  if (trimmed in map) return { val: map[trimmed], recognized: true };
  // case-insensitive
  const lower = trimmed.toLowerCase();
  const hit = Object.keys(map).find((k) => k.toLowerCase() === lower);
  if (hit) return { val: map[hit], recognized: true };
  return { val: fallback, recognized: false };
}

export function computeQuickEstimate(input: QuickEstimateInput): QuickEstimateOutput {
  const baseKauf = lookupCity(CITY_BASE_KAUFPREIS_PER_QM, input.city, FALLBACK_KAUFPREIS);
  const baseMiete = lookupCity(CITY_BASE_MIETE_PER_QM, input.city, FALLBACK_MIETE);

  const assetF = ASSET_TYPE_FACTOR[input.assetType];
  const yearF = yearFactor(input.yearBuilt);

  const marketValue = baseKauf.val * assetF * yearF * input.area;
  const marketValueLow = marketValue * 0.88;
  const marketValueHigh = marketValue * 1.12;

  const rentPerQm = baseMiete.val * yearF;
  const monthlyRent = rentPerQm * input.area;
  const annualRent = monthlyRent * 12;

  const rentMultiplier = marketValue / annualRent;
  const grossYield = (annualRent / marketValue) * 100;

  return {
    marketValue,
    marketValueLow,
    marketValueHigh,
    rentPerQm,
    monthlyRent,
    rentMultiplier,
    grossYield,
    cityRecognized: baseKauf.recognized && baseMiete.recognized,
    formatted: {
      marketValue: eur(marketValue),
      marketValueLow: eur(marketValueLow),
      marketValueHigh: eur(marketValueHigh),
      rentPerQm: eur2(rentPerQm) + "/m²",
      monthlyRent: eur(monthlyRent),
      rentMultiplier: rentMultiplier.toFixed(1) + "×",
      grossYield: grossYield.toFixed(2) + " %"
    }
  };
}
