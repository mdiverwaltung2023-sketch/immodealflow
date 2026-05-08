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

export const PLAN_LIMITS: Record<PlanT, PlanLimits> = {
  FREE: {
    activeListingsMax: 1,
    inquiriesPer30dMax: 3,
    canSeeOffMarket: false,
    hasVerifiedBadge: false
  },
  INVESTOR_PRO: {
    activeListingsMax: 1, // Investor zahlt für die Investor-Seite, Listing-Limit unverändert
    inquiriesPer30dMax: null,
    canSeeOffMarket: true,
    hasVerifiedBadge: true
  },
  SELLER_PRO: {
    activeListingsMax: 10,
    inquiriesPer30dMax: 3, // Seller-Pro fokussiert auf Inserate, Anfrage-Limit wie Free
    canSeeOffMarket: false,
    hasVerifiedBadge: true
  }
};

export function getPlanLimits(plan: PlanT): PlanLimits {
  return PLAN_LIMITS[plan];
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
