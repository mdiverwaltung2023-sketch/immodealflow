// =====================================================================
// Phase Q3 — Investor Trust Score
// Ehrlicher Score (0-100) aus VORHANDENEN Signalen. Keine Black-Box:
// Breakdown wird immer mitgeliefert. Echte Identitaets-/EK-Verifizierung
// (KYC) ist eine spaetere Stufe; v1 basiert auf Profil-Vollstaendigkeit,
// Track Record, Bewertungen und Aktivitaet.
// =====================================================================

export type TrustTier = "BRONZE" | "SILBER" | "GOLD" | "PLATIN";

export type TrustInput = {
  hasProfile: boolean;
  // Profil / Selbstangaben
  equity: number | null;
  monthlyIncome: number | null;
  experienceYears: number;
  financingPreApproved: boolean;
  profileCompleteness: number; // 0..1
  // Track Record
  trackrecordCount: number;
  trackrecordVerifiedCount: number;
  // Bewertungen
  ratingAvg: number | null; // 1..5
  ratingCount: number;
  // Aktivitaet
  acceptedDeals: number;
  activeRequests: number;
};

export type TrustBreakdown = {
  verifizierung: number; // max 30
  trackRecord: number; // max 30
  bewertungen: number; // max 25
  aktivitaet: number; // max 15
};

export type TrustResult = {
  score: number; // 0..100
  tier: TrustTier;
  badges: string[];
  breakdown: TrustBreakdown;
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function tierForScore(score: number): TrustTier {
  if (score >= 85) return "PLATIN";
  if (score >= 65) return "GOLD";
  if (score >= 40) return "SILBER";
  return "BRONZE";
}

export function computeTrustScore(input: TrustInput): TrustResult {
  // --- Verifizierung / Profil (max 30) ---
  const verifizierung = input.hasProfile
    ? clamp01(input.profileCompleteness) * 18 +
      (input.equity && input.equity > 0 ? 6 : 0) +
      (input.financingPreApproved ? 6 : 0)
    : 0;

  // --- Track Record (max 30) ---
  const trackRecord =
    (clamp01(input.trackrecordCount / 5)) * 18 +
    (clamp01(input.trackrecordVerifiedCount / 3)) * 12;

  // --- Bewertungen (max 25) ---
  const ratingWeight = clamp01(input.ratingCount / 3); // erst ab 3 Bewertungen voll gewichtet
  const bewertungen =
    input.ratingAvg != null ? (input.ratingAvg / 5) * 25 * ratingWeight : 0;

  // --- Aktivitaet (max 15) ---
  const aktivitaet =
    (clamp01(input.acceptedDeals / 3)) * 9 + (clamp01(input.activeRequests / 2)) * 6;

  const breakdown: TrustBreakdown = {
    verifizierung: Math.round(verifizierung),
    trackRecord: Math.round(trackRecord),
    bewertungen: Math.round(bewertungen),
    aktivitaet: Math.round(aktivitaet)
  };

  const score = Math.max(
    0,
    Math.min(100, Math.round(verifizierung + trackRecord + bewertungen + aktivitaet))
  );

  const badges: string[] = [];
  if (input.equity && input.equity > 0) badges.push("EK_ANGEGEBEN");
  if (input.financingPreApproved) badges.push("FINANZIERUNG_BEREIT");
  if (input.experienceYears >= 5) badges.push("ERFAHREN");
  if (input.trackrecordCount >= 3) badges.push("TRACK_RECORD");
  if (input.trackrecordVerifiedCount >= 1) badges.push("VERIFIZIERTE_DEALS");
  if (input.ratingAvg != null && input.ratingAvg >= 4.5 && input.ratingCount >= 3)
    badges.push("TOP_BEWERTET");
  if (input.acceptedDeals >= 1) badges.push("AKTIV");

  return { score, tier: tierForScore(score), badges, breakdown };
}

// Verbesserungstipps fuer die eigene Trust-Score-Ansicht.
export function trustTips(input: TrustInput): string[] {
  const tips: string[] = [];
  if (!input.hasProfile) {
    tips.push("Lege dein Investor-Profil an (Eigenkapital, Regionen, Asset-Klassen, Ticketgröße).");
    return tips;
  }
  if (input.profileCompleteness < 0.8)
    tips.push("Vervollständige dein Profil (Bio, Einkommen, Präferenzen) für mehr Punkte.");
  if (!input.equity || input.equity <= 0)
    tips.push("Hinterlege dein verfügbares Eigenkapital.");
  if (!input.financingPreApproved)
    tips.push("Markiere deine Finanzierung als vorab geprüft, wenn vorhanden.");
  if (input.trackrecordCount < 3)
    tips.push("Ergänze abgeschlossene Deals in deinem Track Record.");
  if (input.trackrecordVerifiedCount < 1)
    tips.push("Belege mindestens einen Deal (z. B. Notar-Aktenzeichen) für verifizierte Track-Record-Punkte.");
  if (input.ratingCount < 3)
    tips.push("Sammle Bewertungen aus abgeschlossenen Kontakten, um Vertrauen aufzubauen.");
  if (input.acceptedDeals < 1)
    tips.push("Werde im Co-Investment aktiv — angenommene Anfragen stärken deinen Score.");
  return tips;
}
