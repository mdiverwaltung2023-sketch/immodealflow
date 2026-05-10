/**
 * Phase L11.3 — KI-Verkaufsberater (lokale Heuristik).
 *
 * Zwei Pfade: SELBST oder MAKLER. Hybrid wurde entfernt, weil die
 * Workflows fuer Pro-Fotos / Notar / Bonitaets-Check noch nicht
 * aufgesetzt sind. Sobald sie kommen, kann Hybrid als dritter Pfad
 * wieder ergaenzt werden.
 *
 * Lokal gerechnet, kein Backend-Call. Spaetere Phase L11.4 darf
 * den Claude-Endpoint dazu schalten, der die Texte verfeinert.
 */

export type AssetType = "ETW" | "EFH" | "MFH" | "GEWERBE" | "GRUNDSTUECK";
export type LocationQuality = "TOP" | "GUT" | "MITTEL" | "SCHWACH";
export type Condition = "NEU" | "GEPFLEGT" | "SANIERUNGSBEDARF" | "ABRISS";
export type Occupancy = "LEERSTAND" | "EIGEN" | "VERMIETET";
export type SaleReason =
  | "FREIWILLIG"
  | "ERBSCHAFT"
  | "SCHEIDUNG"
  | "FINANZIELL"
  | "AUSWANDERUNG";
export type TimePressure = "KEIN" | "12M" | "6M" | "3M";
export type Experience = "KEINE" | "ETWAS" | "VIEL";

export type Scenario = "SELBST" | "MAKLER";

export type AdvisorInput = {
  assetType: AssetType;
  city: string;
  locationQuality: LocationQuality;
  area: number;
  yearBuilt: number;
  condition: Condition;
  occupancy: Occupancy;
  saleReason: SaleReason;
  timePressure: TimePressure;
  experience: Experience;
  estimatedValue?: number;
};

export type Factor = { label: string; impact: number; positive: boolean };

export type AdvisorOutput = {
  scores: Record<Scenario, number>;
  recommendation: Scenario;
  positiveFactors: Factor[];
  negativeFactors: Factor[];
  expectedCommissionSavings?: number; // bei Selbst (€)
  estimatedTimeToSale: { selbst: string; makler: string };
};

const ASSET_LABELS: Record<AssetType, string> = {
  ETW: "Eigentumswohnung",
  EFH: "Einfamilienhaus",
  MFH: "Mehrfamilienhaus",
  GEWERBE: "Gewerbe",
  GRUNDSTUECK: "Grundstück"
};

export const ASSET_TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: "ETW", label: "Eigentumswohnung" },
  { value: "EFH", label: "Einfamilienhaus" },
  { value: "MFH", label: "Mehrfamilienhaus" },
  { value: "GEWERBE", label: "Gewerbe" },
  { value: "GRUNDSTUECK", label: "Grundstück" }
];

export const LOCATION_OPTIONS: { value: LocationQuality; label: string }[] = [
  { value: "TOP", label: "Top-Lage (1A, City)" },
  { value: "GUT", label: "Gute Lage (Stadt, gefragt)" },
  { value: "MITTEL", label: "Mittlere Lage (Speckgürtel)" },
  { value: "SCHWACH", label: "Strukturschwache Lage" }
];

export const CONDITION_OPTIONS: { value: Condition; label: string }[] = [
  { value: "NEU", label: "Neu / kernsaniert" },
  { value: "GEPFLEGT", label: "Gepflegt, gut erhalten" },
  { value: "SANIERUNGSBEDARF", label: "Sanierungsbedürftig" },
  { value: "ABRISS", label: "Abriss / Substanz problematisch" }
];

export const OCCUPANCY_OPTIONS: { value: Occupancy; label: string }[] = [
  { value: "LEERSTAND", label: "Leerstehend" },
  { value: "EIGEN", label: "Selbst genutzt" },
  { value: "VERMIETET", label: "Vermietet" }
];

export const REASON_OPTIONS: { value: SaleReason; label: string }[] = [
  { value: "FREIWILLIG", label: "Freiwillig / Optimierung" },
  { value: "ERBSCHAFT", label: "Erbschaft" },
  { value: "SCHEIDUNG", label: "Trennung / Scheidung" },
  { value: "FINANZIELL", label: "Finanzieller Druck" },
  { value: "AUSWANDERUNG", label: "Umzug / Auswanderung" }
];

export const TIME_OPTIONS: { value: TimePressure; label: string }[] = [
  { value: "KEIN", label: "Kein Zeitdruck" },
  { value: "12M", label: "12 Monate" },
  { value: "6M", label: "6 Monate" },
  { value: "3M", label: "3 Monate (eilig)" }
];

export const EXPERIENCE_OPTIONS: { value: Experience; label: string }[] = [
  { value: "KEINE", label: "Keine Erfahrung" },
  { value: "ETWAS", label: "Etwas Erfahrung" },
  { value: "VIEL", label: "Viel Erfahrung (Profi)" }
];

export const ASSET_LABEL = (a: AssetType): string => ASSET_LABELS[a];

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

// [selbst, makler]
type Pair = [number, number];

function deltaForAsset(a: AssetType): Pair {
  switch (a) {
    case "ETW":
      return [+22, -10];
    case "EFH":
      return [+14, 0];
    case "MFH":
      return [-15, +22];
    case "GEWERBE":
      return [-25, +30];
    case "GRUNDSTUECK":
      return [-5, +12];
  }
}

function deltaForLocation(l: LocationQuality): Pair {
  switch (l) {
    case "TOP":
      return [+25, -5];
    case "GUT":
      return [+15, 0];
    case "MITTEL":
      return [-5, +12];
    case "SCHWACH":
      return [-22, +25];
  }
}

function deltaForCondition(c: Condition): Pair {
  switch (c) {
    case "NEU":
      return [+15, 0];
    case "GEPFLEGT":
      return [+10, 0];
    case "SANIERUNGSBEDARF":
      return [-22, +22];
    case "ABRISS":
      return [-30, +30];
  }
}

function deltaForOccupancy(o: Occupancy): Pair {
  switch (o) {
    case "LEERSTAND":
      return [+12, 0];
    case "EIGEN":
      return [+8, 0];
    case "VERMIETET":
      return [-15, +18];
  }
}

function deltaForReason(r: SaleReason): Pair {
  switch (r) {
    case "FREIWILLIG":
      return [+10, -5];
    case "AUSWANDERUNG":
      return [+5, +5];
    case "ERBSCHAFT":
      return [-15, +22];
    case "SCHEIDUNG":
      return [-20, +22];
    case "FINANZIELL":
      return [-10, +18];
  }
}

function deltaForTime(t: TimePressure): Pair {
  switch (t) {
    case "KEIN":
      return [+15, -10];
    case "12M":
      return [+5, 0];
    case "6M":
      return [-10, +12];
    case "3M":
      return [-25, +28];
  }
}

function deltaForExperience(e: Experience): Pair {
  switch (e) {
    case "VIEL":
      return [+25, -18];
    case "ETWAS":
      return [+10, 0];
    case "KEINE":
      return [-22, +22];
  }
}

function deltaForValue(v?: number): Pair {
  if (v == null) return [0, 0];
  if (v >= 2_000_000) return [-15, +25];
  if (v >= 1_000_000) return [-5, +12];
  if (v < 200_000) return [+10, -5];
  return [0, 0];
}

function explain(input: AdvisorInput): { factors: { label: string; deltas: Pair }[] } {
  const factors: { label: string; deltas: Pair }[] = [
    { label: `Objektart: ${ASSET_LABELS[input.assetType]}`, deltas: deltaForAsset(input.assetType) },
    {
      label: `Lage: ${LOCATION_OPTIONS.find((o) => o.value === input.locationQuality)?.label ?? input.locationQuality}`,
      deltas: deltaForLocation(input.locationQuality)
    },
    {
      label: `Zustand: ${CONDITION_OPTIONS.find((o) => o.value === input.condition)?.label ?? input.condition}`,
      deltas: deltaForCondition(input.condition)
    },
    {
      label: `Belegung: ${OCCUPANCY_OPTIONS.find((o) => o.value === input.occupancy)?.label ?? input.occupancy}`,
      deltas: deltaForOccupancy(input.occupancy)
    },
    {
      label: `Anlass: ${REASON_OPTIONS.find((o) => o.value === input.saleReason)?.label ?? input.saleReason}`,
      deltas: deltaForReason(input.saleReason)
    },
    {
      label: `Zeitrahmen: ${TIME_OPTIONS.find((o) => o.value === input.timePressure)?.label ?? input.timePressure}`,
      deltas: deltaForTime(input.timePressure)
    },
    {
      label: `Erfahrung: ${EXPERIENCE_OPTIONS.find((o) => o.value === input.experience)?.label ?? input.experience}`,
      deltas: deltaForExperience(input.experience)
    }
  ];
  if (input.estimatedValue) {
    factors.push({
      label: `Geschätzter Wert: ~${Math.round(input.estimatedValue / 1000)} Tsd. €`,
      deltas: deltaForValue(input.estimatedValue)
    });
  }
  return { factors };
}

export function analyzeSalesStrategy(input: AdvisorInput): AdvisorOutput {
  const { factors } = explain(input);

  let selbst = 50;
  let makler = 50;
  for (const f of factors) {
    selbst += f.deltas[0];
    makler += f.deltas[1];
  }
  selbst = clamp(selbst);
  makler = clamp(makler);

  const scores: Record<Scenario, number> = {
    SELBST: Math.round(selbst),
    MAKLER: Math.round(makler)
  };

  const recommendation: Scenario = scores.SELBST >= scores.MAKLER ? "SELBST" : "MAKLER";

  const idx = recommendation === "SELBST" ? 0 : 1;
  const ranked = [...factors].sort((a, b) => b.deltas[idx] - a.deltas[idx]);
  const positiveFactors: Factor[] = ranked
    .filter((r) => r.deltas[idx] > 0)
    .slice(0, 3)
    .map((r) => ({ label: r.label, impact: r.deltas[idx], positive: true }));
  const negativeFactors: Factor[] = ranked
    .filter((r) => r.deltas[idx] < 0)
    .slice(-2)
    .map((r) => ({ label: r.label, impact: r.deltas[idx], positive: false }));

  let expectedCommissionSavings: number | undefined;
  if (input.estimatedValue && recommendation === "SELBST") {
    expectedCommissionSavings = Math.round(input.estimatedValue * 0.0357);
  }

  const estimatedTimeToSale = {
    selbst: input.timePressure === "3M" ? "4–8 Mon" : "3–6 Mon",
    makler: "1–3 Mon"
  };

  return {
    scores,
    recommendation,
    positiveFactors,
    negativeFactors,
    expectedCommissionSavings,
    estimatedTimeToSale
  };
}

export const SCENARIO_LABELS: Record<Scenario, string> = {
  SELBST: "Selbstvermarktung empfohlen",
  MAKLER: "Maklerunterstützung empfohlen"
};

export const SCENARIO_TONES: Record<Scenario, { dot: string; text: string; bg: string; border: string }> = {
  SELBST: {
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200"
  },
  MAKLER: {
    dot: "bg-rose-500",
    text: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200"
  }
};
