/**
 * Coin- & Makler-Bindungssystem (Phase H2).
 *
 * Library mit den Kern-Helpern earn/spend/getBalance + Sortier-Layer-Abfragen.
 * Earn-Hooks aus Endpoints rufen earn() auf; UI-Spend-Aktionen rufen spend().
 *
 * Design-Prinzipien:
 *  - earn() ist idempotent: zweimaliger Aufruf mit demselben (userId, kind, refId)
 *    schreibt nur einmal eine Buchung. Der zweite Aufruf gibt { ok: false,
 *    reason: "already_earned" } zurueck und bricht NICHT mit Exception ab.
 *    -> Hooks koennen sorglos in jedem POST-Handler aufgerufen werden.
 *  - spend() ist atomar: Saldo-Check und Decrement laufen in einer DB-Transaktion
 *    via conditional updateMany WHERE coinsBalance >= cost.
 *    -> Race Condition (zweimal gleichzeitig spenden) ist sicher.
 *  - User.coinsBalance ist denormalisiert. Quelle der Wahrheit ist
 *    sum(CoinTransaction.amount), aber wir halten Balance synchron in derselben
 *    Transaktion fuer schnelle Reads.
 *  - Early-Bird (+50%) gilt fuer die ersten 100 BROKER-User. Multiplikator wird
 *    pro Earn-Aufruf angewendet, also dauerhaft.
 */

import { Prisma, type CoinTxKind, type UserRole } from "@prisma/client";
import { prisma } from "./prisma.js";

// =========================================================
// Konstanten
// =========================================================

/** Earn-Kinds und ihre Basis-Auszahlungen. */
export const EARN_AMOUNTS: Record<EarnKind, number> = {
  PROFILE_COMPLETED: 100,
  LISTING_ACTIVATED: 10,
  SELLER_CONTACTED: 5,
  DAILY_LOGIN: 1,
  REFERRAL_BROKER_ONBOARDED: 100
};

/** Spend-Kinds und ihre Kosten + Laufzeit-Tage. */
export const SPEND_COSTS: Record<SpendKind, { coins: number; days: number }> = {
  SPEND_LISTING_HIGHLIGHT: { coins: 50, days: 7 },
  SPEND_PROFILE_BOOST: { coins: 200, days: 30 },
  SPEND_FEED_BOOST: { coins: 100, days: 30 }
};

/** Early-Bird: erste N BROKER-User bekommen +50% auf alle Earns. */
export const EARLY_BIRD_LIMIT = 100;
export const EARLY_BIRD_MULTIPLIER = 1.5;

// =========================================================
// Type Helpers
// =========================================================

export type EarnKind =
  | "PROFILE_COMPLETED"
  | "LISTING_ACTIVATED"
  | "SELLER_CONTACTED"
  | "DAILY_LOGIN"
  | "REFERRAL_BROKER_ONBOARDED";

export type SpendKind =
  | "SPEND_LISTING_HIGHLIGHT"
  | "SPEND_PROFILE_BOOST"
  | "SPEND_FEED_BOOST";

export function isEarnKind(kind: CoinTxKind): kind is EarnKind {
  return (
    kind === "PROFILE_COMPLETED" ||
    kind === "LISTING_ACTIVATED" ||
    kind === "SELLER_CONTACTED" ||
    kind === "DAILY_LOGIN" ||
    kind === "REFERRAL_BROKER_ONBOARDED"
  );
}

export function isSpendKind(kind: CoinTxKind): kind is SpendKind {
  return (
    kind === "SPEND_LISTING_HIGHLIGHT" ||
    kind === "SPEND_PROFILE_BOOST" ||
    kind === "SPEND_FEED_BOOST"
  );
}

// =========================================================
// Earn
// =========================================================

export type EarnResult =
  | { ok: true; awarded: number; newBalance: number; multiplierApplied: boolean }
  | { ok: false; reason: "already_earned" }
  | { ok: false; reason: "user_not_found" };

/**
 * Vergibt Coins fuer ein Earn-Event. Idempotent ueber (userId, kind, refId).
 *
 * @param userId  Empfaenger der Coins
 * @param kind    Earn-Event (siehe EarnKind)
 * @param refId   Idempotenz-Key. Konventionen:
 *                  PROFILE_COMPLETED         -> "self"
 *                  LISTING_ACTIVATED         -> Listing.id
 *                  SELLER_CONTACTED          -> Inquiry.id
 *                  DAILY_LOGIN               -> "YYYY-MM-DD" (UTC, siehe todayUtcKey)
 *                  REFERRAL_BROKER_ONBOARDED -> referred User.id
 * @param note    Optionaler Audit-Hinweis
 */
export async function earn(
  userId: string,
  kind: EarnKind,
  refId: string,
  note?: string
): Promise<EarnResult> {
  const baseAmount = EARN_AMOUNTS[kind];

  return prisma.$transaction(async (tx) => {
    // User laden, um Early-Bird-Multiplikator zu kennen.
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { isEarlyBird: true }
    });
    if (!user) return { ok: false, reason: "user_not_found" } as const;

    const multiplierApplied = user.isEarlyBird;
    const amount = multiplierApplied
      ? Math.round(baseAmount * EARLY_BIRD_MULTIPLIER)
      : baseAmount;

    try {
      await tx.coinTransaction.create({
        data: {
          userId,
          kind,
          amount,
          refId,
          note: note ?? (multiplierApplied ? "early-bird +50%" : null)
        }
      });
    } catch (err) {
      // P2002 = Unique Constraint Violation -> idempotenter Re-Aufruf.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return { ok: false, reason: "already_earned" } as const;
      }
      throw err;
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: { coinsBalance: { increment: amount } },
      select: { coinsBalance: true }
    });

    return {
      ok: true as const,
      awarded: amount,
      newBalance: updated.coinsBalance,
      multiplierApplied
    };
  });
}

// =========================================================
// Spend
// =========================================================

export type SpendResult =
  | {
      ok: true;
      spent: number;
      newBalance: number;
      validUntil: Date;
      spendId: string;
    }
  | { ok: false; reason: "insufficient_balance"; balance: number; cost: number }
  | { ok: false; reason: "user_not_found" };

/**
 * Spendet Coins fuer eine Sichtbarkeits-Aktion. Atomar: Saldo-Check und
 * Decrement laufen in einer Transaktion mit conditional update, sodass
 * gleichzeitige Aufrufe nicht in negativem Saldo enden.
 *
 * @param userId    Spender
 * @param kind      SpendKind (LISTING_HIGHLIGHT, PROFILE_BOOST, FEED_BOOST)
 * @param targetId  Bei LISTING_HIGHLIGHT: Listing.id (sonst null/undefined)
 */
export async function spend(
  userId: string,
  kind: SpendKind,
  targetId?: string | null
): Promise<SpendResult> {
  const cfg = SPEND_COSTS[kind];
  const cost = cfg.coins;
  const validUntil = new Date(Date.now() + cfg.days * 24 * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { coinsBalance: true }
    });
    if (!user) return { ok: false, reason: "user_not_found" } as const;

    if (user.coinsBalance < cost) {
      return {
        ok: false as const,
        reason: "insufficient_balance",
        balance: user.coinsBalance,
        cost
      };
    }

    // Atomar: nur abbuchen, wenn Saldo immer noch >= cost ist (Race-Schutz).
    const decrement = await tx.user.updateMany({
      where: { id: userId, coinsBalance: { gte: cost } },
      data: { coinsBalance: { decrement: cost } }
    });
    if (decrement.count !== 1) {
      // Kann nur passieren, wenn ein paralleler spend() in der Zwischenzeit
      // den Saldo unter cost gedrueckt hat.
      return {
        ok: false as const,
        reason: "insufficient_balance",
        balance: user.coinsBalance,
        cost
      };
    }

    const spendRow = await tx.coinSpend.create({
      data: {
        userId,
        kind,
        targetId: targetId ?? null,
        validUntil
      }
    });

    await tx.coinTransaction.create({
      data: {
        userId,
        kind,
        amount: -cost,
        // refId zeigt zurueck auf die CoinSpend-Zeile (Audit).
        refId: spendRow.id,
        note: targetId ? `target=${targetId}` : null
      }
    });

    const after = await tx.user.findUnique({
      where: { id: userId },
      select: { coinsBalance: true }
    });

    return {
      ok: true as const,
      spent: cost,
      newBalance: after?.coinsBalance ?? 0,
      validUntil,
      spendId: spendRow.id
    };
  });
}

// =========================================================
// Reads
// =========================================================

export async function getBalance(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { coinsBalance: true }
  });
  return u?.coinsBalance ?? 0;
}

export async function listTransactions(userId: string, limit = 50) {
  return prisma.coinTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit
  });
}

/** Aktive Spends eines Users (validUntil > now). */
export async function listActiveSpends(userId: string) {
  return prisma.coinSpend.findMany({
    where: { userId, validUntil: { gt: new Date() } },
    orderBy: { validUntil: "desc" }
  });
}

/** Sortier-Layer: ist dieses Listing aktuell ge-highlightet? */
export async function isListingHighlighted(listingId: string): Promise<boolean> {
  const hit = await prisma.coinSpend.findFirst({
    where: {
      kind: "SPEND_LISTING_HIGHLIGHT",
      targetId: listingId,
      validUntil: { gt: new Date() }
    },
    select: { id: true }
  });
  return !!hit;
}

/** Welche Listings sind aktuell ge-highlightet (Bulk-Lookup fuer Marketplace). */
export async function getHighlightedListingIds(): Promise<Set<string>> {
  const rows = await prisma.coinSpend.findMany({
    where: {
      kind: "SPEND_LISTING_HIGHLIGHT",
      validUntil: { gt: new Date() },
      targetId: { not: null }
    },
    select: { targetId: true }
  });
  return new Set(rows.map((r) => r.targetId!).filter(Boolean));
}

/** Hat User aktiven Profile-Boost? */
export async function hasProfileBoost(userId: string): Promise<boolean> {
  const hit = await prisma.coinSpend.findFirst({
    where: {
      userId,
      kind: "SPEND_PROFILE_BOOST",
      validUntil: { gt: new Date() }
    },
    select: { id: true }
  });
  return !!hit;
}

/** Hat User aktiven Feed-Boost? */
export async function hasFeedBoost(userId: string): Promise<boolean> {
  const hit = await prisma.coinSpend.findFirst({
    where: {
      userId,
      kind: "SPEND_FEED_BOOST",
      validUntil: { gt: new Date() }
    },
    select: { id: true }
  });
  return !!hit;
}

/** User-IDs mit aktivem Profile-Boost (fuer Broker-Liste). */
export async function getProfileBoostedUserIds(): Promise<Set<string>> {
  const rows = await prisma.coinSpend.findMany({
    where: {
      kind: "SPEND_PROFILE_BOOST",
      validUntil: { gt: new Date() }
    },
    select: { userId: true }
  });
  return new Set(rows.map((r) => r.userId));
}

/** User-IDs mit aktivem Feed-Boost (fuer Marketplace-Sort). */
export async function getFeedBoostedUserIds(): Promise<Set<string>> {
  const rows = await prisma.coinSpend.findMany({
    where: {
      kind: "SPEND_FEED_BOOST",
      validUntil: { gt: new Date() }
    },
    select: { userId: true }
  });
  return new Set(rows.map((r) => r.userId));
}

// =========================================================
// Early-Bird
// =========================================================

/**
 * Wird beim Onboarding eines BROKER-Users aufgerufen. Wenn unter den
 * EARLY_BIRD_LIMIT (=100) ersten BROKER -> Flag setzen.
 * Idempotent: zweimaliger Aufruf aendert nichts, wenn das Flag bereits aktiv ist.
 *
 * Race: minimale Race ist OK — bei sehr hoher Last koennten 101 oder 102 User
 * den Bonus bekommen. Akzeptabel fuer V1.
 */
export async function maybeMarkEarlyBird(userId: string, role: UserRole): Promise<boolean> {
  if (role !== "BROKER") return false;

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { isEarlyBird: true, role: true }
  });
  if (!u || u.isEarlyBird) return u?.isEarlyBird ?? false;

  const earlyBirdCount = await prisma.user.count({
    where: { role: "BROKER", isEarlyBird: true }
  });
  if (earlyBirdCount >= EARLY_BIRD_LIMIT) return false;

  await prisma.user.update({
    where: { id: userId },
    data: { isEarlyBird: true }
  });
  return true;
}

// =========================================================
// Utilities
// =========================================================

/** UTC-Tagesschluessel fuer DAILY_LOGIN-Idempotenz. Format: "YYYY-MM-DD". */
export function todayUtcKey(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
