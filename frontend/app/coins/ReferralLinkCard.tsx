"use client";

import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui";

/**
 * Phase H7 — Referral-Link-Card.
 *
 * Zeigt dem User seinen persoenlichen Werbe-Link mit Copy-Button. Pro
 * geworbenem User, der Profil + erstes ACTIVE-Inserat erreicht, gibt es
 * 100 Coins (Early-Bird +50 %).
 */
export function ReferralLinkCard({
  userId,
  isEarlyBird,
  rewardBase,
  multiplier,
  referralCount
}: {
  userId: string;
  isEarlyBird: boolean;
  rewardBase: number;
  multiplier: number;
  referralCount: number;
}) {
  const [copied, setCopied] = useState(false);
  // origin ist nur client-side verfuegbar — Default fuer Server-Render +
  // SSR-Match, dann via useEffect auf den echten Origin korrigieren.
  const [origin, setOrigin] = useState<string>("https://infinityoikos.com");
  useEffect(() => {
    if (typeof window !== "undefined" && window.location?.origin) {
      setOrigin(window.location.origin);
    }
  }, []);

  const link = `${origin}/sign-up?ref=${userId}`;
  const reward = isEarlyBird ? Math.round(rewardBase * multiplier) : rewardBase;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: Selektion
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  return (
    <Card title="Lade Makler ein">
      <div className="text-sm text-zinc-600">
        Pro geworbenem Makler, der sein Profil ausfüllt und sein erstes Inserat
        aktiviert, bekommst du{" "}
        <span className="font-semibold text-amber-600">+{reward} Coins</span>
        {isEarlyBird ? (
          <span className="text-xs text-amber-700">
            {" "}
            (Early-Bird: {rewardBase} × {multiplier.toFixed(1)})
          </span>
        ) : null}
        .
        {referralCount > 0 ? (
          <span className="ml-1 text-xs text-zinc-500">
            Bisher belohnt: {referralCount} Einladung{referralCount === 1 ? "" : "en"}.
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={link}
          className="min-w-[200px] flex-1 rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button onClick={copy}>{copied ? "Kopiert ✓" : "Link kopieren"}</Button>
      </div>

      <div className="mt-2 text-[10px] text-zinc-400">
        Coin-Vergabe erst, wenn der Geworbene Profil-Pflichtfelder + ein
        ACTIVE-Inserat erreicht hat (Anti-Farming).
      </div>
    </Card>
  );
}
