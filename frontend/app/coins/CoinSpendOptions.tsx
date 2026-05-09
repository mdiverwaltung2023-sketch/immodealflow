"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import { Button, Card } from "@/components/ui";
import type { SpendKindT } from "@/lib/api";

type SpendCfg = { coins: number; days: number };
type SpendCosts = Partial<Record<SpendKindT, SpendCfg>>;

const SPEND_LABELS: Record<SpendKindT, { title: string; subtitle: string; icon: string }> = {
  SPEND_LISTING_HIGHLIGHT: {
    title: "Inserat hervorheben",
    subtitle: "Gelber Rand auf einem deiner Inserate",
    icon: "✨"
  },
  SPEND_PROFILE_BOOST: {
    title: "Profil-Boost",
    subtitle: "Dein Maklerprofil erscheint oben in der Maklerliste",
    icon: "🚀"
  },
  SPEND_FEED_BOOST: {
    title: "Feed-Boost",
    subtitle: "Deine Inserate werden im Marketplace höher sortiert",
    icon: "📈"
  }
};

const ORDER: SpendKindT[] = ["SPEND_LISTING_HIGHLIGHT", "SPEND_PROFILE_BOOST", "SPEND_FEED_BOOST"];

export function CoinSpendOptions({
  balance,
  spendCosts
}: {
  balance: number;
  spendCosts: SpendCosts;
}) {
  return (
    <Card title="Coins ausgeben">
      <div className="grid gap-3 md:grid-cols-3">
        {ORDER.map((kind) => {
          const cfg = spendCosts[kind];
          if (!cfg) return null;
          return (
            <SpendOption
              key={kind}
              kind={kind}
              cfg={cfg}
              balance={balance}
              {...SPEND_LABELS[kind]}
            />
          );
        })}
      </div>
      <div className="mt-3 text-[10px] text-zinc-400">
        Coins sind nicht in Euro umtauschbar — sie verbessern nur deine
        Sichtbarkeit innerhalb von Infinity Oikos.
      </div>
    </Card>
  );
}

function SpendOption({
  kind,
  cfg,
  balance,
  title,
  subtitle,
  icon
}: {
  kind: SpendKindT;
  cfg: SpendCfg;
  balance: number;
  title: string;
  subtitle: string;
  icon: string;
}) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const canAfford = balance >= cfg.coins;
  const needsTarget = kind === "SPEND_LISTING_HIGHLIGHT";

  async function execute(targetId?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/me/coins/spend", {
        method: "POST",
        body: JSON.stringify({ kind, targetId })
      });
      if (res.status === 402) {
        const j = await res.json().catch(() => null);
        setError(j?.message ?? "Nicht genug Coins.");
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setError(j?.error ?? `Fehler ${res.status}`);
        return;
      }
      // Erfolg -> Server-Component soll neu laden
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
      setPickerOpen(false);
    }
  }

  function onClick() {
    if (busy) return;
    if (!canAfford) {
      setError(`Du brauchst noch ${cfg.coins - balance} Coins.`);
      return;
    }
    if (needsTarget) {
      setPickerOpen(true);
      return;
    }
    if (!confirm(`${cfg.coins} Coins für ${cfg.days} Tage ausgeben?`)) return;
    void execute();
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 text-sm font-semibold text-zinc-900">{title}</div>
      <div className="mt-0.5 text-xs text-zinc-500">{subtitle}</div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-lg font-bold text-amber-600">{cfg.coins}</span>
        <span className="text-xs text-zinc-500">Coins · {cfg.days} Tage</span>
      </div>
      <Button
        onClick={onClick}
        disabled={busy || !canAfford}
        variant={canAfford ? "primary" : "secondary"}
        className="mt-3 w-full"
      >
        {busy ? "Sende …" : canAfford ? "Buchen" : "Nicht genug Coins"}
      </Button>
      {error ? (
        <div className="mt-2 rounded-lg bg-rose-50 px-2 py-1.5 text-xs text-rose-700">
          {error}
        </div>
      ) : null}
      {pickerOpen && needsTarget ? (
        <ListingPicker
          onPick={(id) => void execute(id)}
          onClose={() => setPickerOpen(false)}
          busy={busy}
        />
      ) : null}
    </div>
  );
}

/* ---------- Listing-Picker fuer SPEND_LISTING_HIGHLIGHT ---------- */

type ActiveListing = { id: string; title: string; city: string };

function ListingPicker({
  onPick,
  onClose,
  busy
}: {
  onPick: (id: string) => void;
  onClose: () => void;
  busy: boolean;
}) {
  const apiFetch = useApiFetch();
  const [listings, setListings] = useState<ActiveListing[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await apiFetch("/me/listings?status=ACTIVE");
        if (!r.ok) {
          if (live) setErr(`Fehler ${r.status}`);
          return;
        }
        const json = (await r.json()) as Array<{ id: string; title: string; city: string }>;
        if (live) {
          setListings(json.map((l) => ({ id: l.id, title: l.title, city: l.city })));
        }
      } catch (e) {
        if (live) setErr(e instanceof Error ? e.message : "Fehler beim Laden");
      }
    })();
    return () => {
      live = false;
    };
  }, [apiFetch]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-base font-semibold text-zinc-900">
          Welches Inserat soll hervorgehoben werden?
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          Nur ACTIVE-Inserate. 50 Coins, 7 Tage gelber Rand.
        </div>
        {err ? (
          <div className="mt-3 rounded bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>
        ) : !listings ? (
          <div className="mt-3 text-sm text-zinc-500">Lade Inserate …</div>
        ) : listings.length === 0 ? (
          <div className="mt-3 text-sm text-zinc-500">
            Du hast aktuell keine ACTIVE-Inserate. Aktiviere zuerst eines unter
            „Meine Inserate".
          </div>
        ) : (
          <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto">
            {listings.map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => onPick(l.id)}
                  disabled={busy}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm hover:bg-zinc-50 disabled:opacity-50"
                >
                  <div className="font-medium text-zinc-900">{l.title}</div>
                  <div className="text-xs text-zinc-500">{l.city}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Abbrechen
          </Button>
        </div>
      </div>
    </div>
  );
}
