/**
 * Plan-bezogene Limits + Helper für Feature-Gating.
 *
 * Backend ist Source-of-Truth: das Frontend zeigt zwar Lock-Icons und
 * Hinweise, aber wer den Frontend-Check umgeht, läuft trotzdem in
 * diese Backend-Sperren.
 */

import { prisma } from "./prisma.js";

export type PlanT = "FREE" | "INVESTOR_PRO" | "SELLER_PRO";

export type PlanLimits = {
  /** Max gleichzeitig ACTIVE Inserate; null = unlimited */
  activeListingsMax: number | null;
  /** Max ausgehende Anfragen in 30 Tagen; null = unlimited */
  inquiriesPer30dMax: number | null;
  /** Darf Off-Market-Inserate (anonymizationLevel=CITY_ONLY) sehen */
  canSeeOffMarket: boolean;
  /** Darf "Verifiziert"-Badge tragen */
  hasVerifiedBadge: boolean;
};

// Phase L9 — Pricing-Pivot:
// Verkaeufer-/Vermieter-Inserate sind in der Wachstumsphase generell
// kostenlos und unlimitiert. Monetarisierung primaer ueber den
// Investor Club (vormals INVESTOR_PRO). SELLER_PRO bleibt im Code
// fuer Bestandskunden, hat aber keine harten Limits mehr — Bestand
// laeuft am Periodenende automatisch auf FREE aus.
export const PLAN_LIMITS: Record<PlanT, PlanLimits> = {
  FREE: {
    activeListingsMax: null, // unbegrenzt — Verkaeufer/Vermieter inserieren frei
    inquiriesPer30dMax: 3,   // Investor-Drosselung bleibt — der Push zu Investor Club
    canSeeOffMarket: false,
    hasVerifiedBadge: false
  },
  INVESTOR_PRO: {
    activeListingsMax: null,
    inquiriesPer30dMax: null,
    canSeeOffMarket: true,
    hasVerifiedBadge: true
  },
  SELLER_PRO: {
    // Legacy — Bestandskunden behalten ihren Plan, im UI nicht mehr angeboten.
    activeListingsMax: null,
    inquiriesPer30dMax: 3,
    canSeeOffMarket: false,
    hasVerifiedBadge: true
  }
};

export function getPlanLimits(plan: PlanT): PlanLimits {
  return PLAN_LIMITS[plan];
}


/**
 * Effektiver Plan fuer Feature-Gating. Source-of-Truth fuer "kostet nichts":
 * - INVESTOR_FREE_PHASE (Default an): in der Wachstumsphase bekommen ALLE
 *   Investoren INVESTOR_PRO-Entitlement gratis. Spaeter via Env abschaltbar.
 * - Gruendungsmitglieder (isFoundingMember) behalten INVESTOR_PRO dauerhaft
 *   gratis, auch wenn die Free-Phase endet.
 * Aendert NICHT den gespeicherten Plan/Stripe-Status - nur die Berechtigung.
 */
export function effectivePlan(
  user: { plan?: PlanT | string | null; isFoundingMember?: boolean | null } | null | undefined
): PlanT {
  const investorsFree = (process.env.INVESTOR_FREE_PHASE ?? "true") !== "false";
  if (investorsFree) return "INVESTOR_PRO";
  if (user?.isFoundingMember) return "INVESTOR_PRO";
  return ((user?.plan ?? "FREE") as PlanT);
}

/** Wieviele aktive Inserate hat der User aktuell? */
export async function countActiveListings(userId: string): Promise<number> {
  return prisma.listing.count({
    where: { ownerId: userId, status: "ACTIVE" }
  });
}

/** Wieviele Anfragen hat der User in den letzten 30 Tagen abgeschickt? */
export async function countInquiriesLast30d(userId: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return prisma.inquiry.count({
    where: {
      investorId: userId,
      createdAt: { gte: since }
    }
  });
}

/**
 * Standard-Antwort für Pay-Wall — 402 Payment Required mit
 * strukturiertem Body, den das Frontend gezielt abfangen kann.
 */
export type PaywallReason =
  | "off_market_locked"
  | "inquiry_limit_reached"
  | "listing_limit_reached";

export function paywallBody(opts: {
  reason: PaywallReason;
  message: string;
  upgradeTo: "INVESTOR_PRO" | "SELLER_PRO";
  /** Optional: aktuelle Werte für UI-Anzeige */
  current?: number;
  limit?: number;
}) {
  return {
    error: "payment_required",
    paywall: {
      reason: opts.reason,
      message: opts.message,
      upgradeTo: opts.upgradeTo,
      current: opts.current,
      limit: opts.limit
    }
  };
}
