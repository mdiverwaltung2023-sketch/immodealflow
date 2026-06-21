// =====================================================================
// Phase Q — Co-Investment Hub: Matching-Engine
// Berechnet einen Match-Score (0–100) zwischen einem Co-Investment-Gesuch
// (CoInvestRequest) und einem Kapitalgeber-Profil (InvestorProfile).
// Sechs gewichtete Faktoren, immer mit Breakdown (keine Black-Box).
// Siehe phase_Q_concept.md, Abschnitt "Matching-Engine".
//
// Bewusst strukturell typisiert (kein Prisma-Import), damit die Engine
// pur, testbar und unabhaengig vom DB-Layer bleibt.
// =====================================================================

export type MatchRequestInput = {
  assetType?: string | null;
  location?: string | null;
  capitalNeed?: number | null;
  strategy?: string | null;
  targetReturnPct?: number | null;
};

export type MatchProfileInput = {
  preferredAssetTypes?: string[] | null;
  preferredRegions?: string[] | null;
  minTicketSize?: number | null;
  maxTicketSize?: number | null;
  investmentExperienceYears?: number | null;
  // Q3-Vorbereitung: optional, falls spaeter am Profil gepflegt.
  preferredStrategies?: string[] | null;
  targetReturnPct?: number | null;
  trustScore?: number | null; // 0–100, Q3
};

export type MatchBreakdown = {
  region: number;
  assetType: number;
  volume: number;
  strategy: number;
  return: number;
  experience: number;
};

export type MatchResult = {
  score: number; // 0–100, gerundet
  parts: MatchBreakdown; // jeweils 0–1
};

// Gewichte (Summe = 1.0). Single Source of Truth fuer das Scoring.
export const MATCH_WEIGHTS = {
  region: 0.2,
  assetType: 0.2,
  volume: 0.2,
  strategy: 0.15,
  return: 0.15,
  experience: 0.1
} as const;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const norm = (s: string) => s.trim().toLowerCase();

// --- Region -----------------------------------------------------------
// Voll-Treffer (1.0) bei direkter Uebereinstimmung, Teil-Treffer (0.6)
// bei Substring/Praefix (z.B. "Berlin" vs "Berlin-Mitte" oder PLZ-Anfang),
// 0 wenn nichts passt. Leere Praeferenzen = offen = neutral 0.5.
export function scoreRegion(location: string | null | undefined, prefs: string[] | null | undefined): number {
  const loc = norm(location ?? "");
  const list = (prefs ?? []).map(norm).filter(Boolean);
  if (!loc) return 0.4;
  if (list.length === 0) return 0.5; // Kapitalgeber ohne Regions-Filter = offen
  for (const p of list) {
    if (!p) continue;
    if (p === loc) return 1.0;
    if (loc.includes(p) || p.includes(loc)) return 0.6;
    // PLZ-Praefix (erste 2 Stellen)
    if (/^\d{3,}/.test(loc) && /^\d{2,}/.test(p) && loc.slice(0, 2) === p.slice(0, 2)) return 0.6;
  }
  return 0;
}

// --- Objektart --------------------------------------------------------
export function scoreAssetType(assetType: string | null | undefined, prefs: string[] | null | undefined): number {
  if (!assetType) return 0.4; // Gesuch ohne Objektart = unspezifisch
  const list = prefs ?? [];
  if (list.length === 0) return 0.5; // Kapitalgeber ohne Asset-Filter = offen
  return list.includes(assetType) ? 1.0 : 0;
}

// --- Volumen ----------------------------------------------------------
// 1.0 wenn Kapitalbedarf im Ticket-Korridor, linear fallend bis 0 ab
// 50 % Abweichung ausserhalb des Korridors.
export function scoreVolume(
  capitalNeed: number | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined
): number {
  if (capitalNeed == null || capitalNeed <= 0) return 0.4;
  const lo = min ?? 0;
  const hi = max ?? Number.POSITIVE_INFINITY;
  if (capitalNeed >= lo && capitalNeed <= hi) return 1.0;
  if (capitalNeed < lo && lo > 0) {
    const dev = (lo - capitalNeed) / lo; // relative Unterschreitung
    return clamp01(1 - dev * 2);
  }
  if (hi !== Number.POSITIVE_INFINITY && capitalNeed > hi && hi > 0) {
    const dev = (capitalNeed - hi) / hi; // relative Ueberschreitung
    return clamp01(1 - dev * 2);
  }
  return 0.5;
}

// --- Strategie --------------------------------------------------------
// Q1: InvestorProfile haelt (noch) keine Strategie -> neutral 0.5.
// Sobald preferredStrategies gepflegt sind, exakter Abgleich.
export function scoreStrategy(strategy: string | null | undefined, prefs: string[] | null | undefined): number {
  if (!prefs || prefs.length === 0) return 0.5;
  if (!strategy) return 0.4;
  return prefs.includes(strategy) ? 1.0 : 0.2;
}

// --- Rendite ----------------------------------------------------------
// Q1: InvestorProfile haelt (noch) kein Renditeziel -> neutral 0.5.
// Mit Ziel: Erwartung >= Ziel = 1.0, bis 1 %-Punkt darunter = 0.7,
// danach linear fallend ueber 4 %-Punkte.
export function scoreReturn(
  targetReturnPct: number | null | undefined,
  profileTarget: number | null | undefined
): number {
  if (profileTarget == null) return 0.5;
  if (targetReturnPct == null) return 0.4;
  const diff = targetReturnPct - profileTarget; // positiv = Gesuch bietet mehr
  if (diff >= 0) return 1.0;
  if (diff >= -1) return 0.7;
  return clamp01(0.7 + (diff + 1) / 4); // faellt von 0.7 bis 0 ueber 4 %-Punkte
}

// --- Erfahrung / Trust ------------------------------------------------
// Kombiniert Erfahrungsjahre (gesaettigt bei 10 J) und — sobald vorhanden —
// den Trust Score (Q3). Q1: nur Erfahrung.
export function scoreExperience(years: number | null | undefined, trustScore: number | null | undefined): number {
  const expPart = clamp01((years ?? 0) / 10);
  if (trustScore == null) return expPart;
  const trustPart = clamp01(trustScore / 100);
  return clamp01(0.5 * expPart + 0.5 * trustPart);
}

// --- Gesamt -----------------------------------------------------------
export function scoreMatch(request: MatchRequestInput, profile: MatchProfileInput): MatchResult {
  const parts: MatchBreakdown = {
    region: scoreRegion(request.location, profile.preferredRegions),
    assetType: scoreAssetType(request.assetType, profile.preferredAssetTypes),
    volume: scoreVolume(request.capitalNeed, profile.minTicketSize, profile.maxTicketSize),
    strategy: scoreStrategy(request.strategy, profile.preferredStrategies),
    return: scoreReturn(request.targetReturnPct, profile.targetReturnPct),
    experience: scoreExperience(profile.investmentExperienceYears, profile.trustScore)
  };

  const weighted =
    MATCH_WEIGHTS.region * parts.region +
    MATCH_WEIGHTS.assetType * parts.assetType +
    MATCH_WEIGHTS.volume * parts.volume +
    MATCH_WEIGHTS.strategy * parts.strategy +
    MATCH_WEIGHTS.return * parts.return +
    MATCH_WEIGHTS.experience * parts.experience;

  return { score: Math.round(clamp01(weighted) * 100), parts };
}
