import Link from "next/link";
import { CoinsViewSchema, COIN_TX_LABELS, type CoinsViewT } from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { CoinSpendOptions } from "./CoinSpendOptions";
import { ReferralLinkCard } from "./ReferralLinkCard";

export const dynamic = "force-dynamic";

export default async function CoinsPage() {
  const me = await requireOnboardedUser();
  const view = await apiGet("/me/coins", CoinsViewSchema);

  // Anzahl bereits ausgeloester Referral-Earns aus dem Verlauf zaehlen.
  const referralCount = view.transactions.filter(
    (tx) => tx.kind === "REFERRAL_BROKER_ONBOARDED"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-2xl font-semibold text-zinc-900">Meine Coins</div>
          <div className="mt-1 text-sm text-zinc-500">
            Coins verdienst du durch Aktivität auf Infinity Oikos. Du kannst sie
            in zusätzliche Sichtbarkeit investieren — Coins sind nicht in Euro
            umtauschbar.
          </div>
        </div>
        <BalanceBadge view={view} />
      </div>

      {view.isEarlyBird ? <EarlyBirdBanner /> : null}

      <ActiveSpendsCard view={view} />

      <CoinSpendOptions
        balance={view.balance}
        spendCosts={view.spendCosts}
      />

      <ReferralLinkCard
        userId={me.id}
        isEarlyBird={view.isEarlyBird}
        rewardBase={view.earnAmounts.REFERRAL_BROKER_ONBOARDED}
        multiplier={view.multiplier}
        referralCount={referralCount}
      />

      <EarnTableCard view={view} />

      <TransactionsCard view={view} />
    </div>
  );
}

/* ---------- Sub-Components ---------- */

function BalanceBadge({ view }: { view: CoinsViewT }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 px-5 py-3 text-white shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100">
        Aktueller Stand
      </div>
      <div className="mt-0.5 text-2xl font-bold leading-tight">
        {view.balance.toLocaleString("de-DE")}{" "}
        <span className="text-sm font-medium text-amber-100">Coins</span>
      </div>
    </div>
  );
}

function EarlyBirdBanner() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
      <span className="font-semibold">Early-Bird aktiv:</span> Du gehörst zu den
      ersten 100 Maklern und bekommst dauerhaft +50 % auf alle Earn-Events.
    </div>
  );
}

function ActiveSpendsCard({ view }: { view: CoinsViewT }) {
  if (view.activeSpends.length === 0) return null;
  return (
    <Card title="Aktive Boosts">
      <ul className="space-y-2">
        {view.activeSpends.map((s) => {
          const remainingMs = new Date(s.validUntil).getTime() - Date.now();
          const remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
          return (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium text-zinc-900">
                  {COIN_TX_LABELS[s.kind]}
                </div>
                {s.targetId ? (
                  <Link
                    href={`/listings/${s.targetId}/edit`}
                    className="text-[11px] text-indigo-600 hover:underline"
                  >
                    Inserat öffnen
                  </Link>
                ) : null}
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-emerald-700">
                  noch {remainingDays} Tag{remainingDays === 1 ? "" : "e"}
                </div>
                <div className="text-[10px] text-zinc-400">
                  bis {new Date(s.validUntil).toLocaleDateString("de-DE")}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function EarnTableCard({ view }: { view: CoinsViewT }) {
  const items: { kind: keyof typeof view.earnAmounts; desc: string }[] = [
    { kind: "PROFILE_COMPLETED", desc: "Einmalig nach Ausfüllen deines Profils" },
    { kind: "LISTING_ACTIVATED", desc: "Pro aktiviertem Inserat (einmalig je Inserat)" },
    {
      kind: "SELLER_CONTACTED",
      desc: "Wenn ein Verkäufer auf deine Anfrage antwortet"
    },
    { kind: "DAILY_LOGIN", desc: "Einmal pro Tag" },
    {
      kind: "REFERRAL_BROKER_ONBOARDED",
      desc: "Pro geworbenem Makler, der Profil + erstes Inserat aktiviert"
    }
  ];
  return (
    <Card title="So verdienst du Coins">
      <ul className="divide-y divide-zinc-200">
        {items.map((it) => {
          const base = view.earnAmounts[it.kind];
          const effective = view.isEarlyBird ? Math.round(base * view.multiplier) : base;
          return (
            <li
              key={it.kind}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium text-zinc-900">
                  {COIN_TX_LABELS[it.kind]}
                </div>
                <div className="text-xs text-zinc-500">{it.desc}</div>
              </div>
              <div className="text-right">
                <div className="text-base font-semibold text-amber-600">
                  +{effective}
                </div>
                {view.isEarlyBird ? (
                  <div className="text-[10px] text-zinc-400">
                    statt {base} (Early-Bird)
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function TransactionsCard({ view }: { view: CoinsViewT }) {
  if (view.transactions.length === 0) {
    return (
      <Card title="Verlauf">
        <div className="text-sm text-zinc-500">
          Noch keine Buchungen. Sobald du dein Profil ausfüllst oder ein Inserat
          aktivierst, taucht hier die erste Buchung auf.
        </div>
      </Card>
    );
  }
  return (
    <Card title="Verlauf (letzte 50)">
      <ul className="divide-y divide-zinc-200">
        {view.transactions.map((tx) => {
          const sign = tx.amount >= 0 ? "+" : "";
          const color = tx.amount >= 0 ? "text-emerald-700" : "text-rose-600";
          return (
            <li key={tx.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div>
                <div className="font-medium text-zinc-900">
                  {COIN_TX_LABELS[tx.kind]}
                </div>
                <div className="text-[10px] text-zinc-400">
                  {new Date(tx.createdAt).toLocaleString("de-DE")}
                  {tx.note ? ` · ${tx.note}` : ""}
                </div>
              </div>
              <div className={`text-sm font-semibold tabular-nums ${color}`}>
                {sign}
                {tx.amount}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
