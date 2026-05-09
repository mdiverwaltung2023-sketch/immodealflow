import { redirect } from "next/navigation";
import {
  AdminCoinsOverviewSchema,
  AdminCoinsTransactionsSchema,
  AdminCoinsActiveSpendsSchema,
  COIN_TX_LABELS,
  type AdminCoinsOverviewT,
  type AdminCoinsTransactionsT,
  type AdminCoinsActiveSpendsT
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { AdminAdjustForm } from "./AdminAdjustForm";

export const dynamic = "force-dynamic";

export default async function AdminCoinsPage() {
  const me = await requireOnboardedUser();
  if (!me.isAdmin) {
    redirect("/dashboard");
  }

  const [overview, txResp, activeSpends] = await Promise.all([
    apiGet("/admin/coins/overview", AdminCoinsOverviewSchema),
    apiGet("/admin/coins/transactions?limit=100", AdminCoinsTransactionsSchema),
    apiGet("/admin/coins/active-spends", AdminCoinsActiveSpendsSchema)
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-zinc-900">
          Admin · Coin-System
        </div>
        <div className="mt-1 text-sm text-zinc-500">
          Aggregate, Transaktionen und aktive Spends. Manuelle Korrekturen unten.
        </div>
      </div>

      <OverviewSection overview={overview} />

      <TransactionsSection tx={txResp} />

      <ActiveSpendsSection spends={activeSpends} />

      <AdminAdjustForm />
    </div>
  );
}

/* ---------- Übersicht ---------- */

function OverviewSection({ overview }: { overview: AdminCoinsOverviewT }) {
  return (
    <Card title="Übersicht">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiTile label="User gesamt" value={overview.totalUsers.toLocaleString("de-DE")} />
        <KpiTile
          label="Early-Birds"
          value={`${overview.earlyBirdsActive} / ${overview.earlyBirdLimit}`}
        />
        <KpiTile
          label="Coins in Umlauf"
          value={overview.coinsInCirculation.toLocaleString("de-DE")}
        />
        <KpiTile
          label="Ø Saldo / User"
          value={overview.avgBalance.toLocaleString("de-DE")}
        />
        <KpiTile label="Aktive Spends" value={overview.activeSpendsCount.toString()} />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Top-10 Earner (Saldo)
          </div>
          <ul className="divide-y divide-zinc-200">
            {overview.topEarners.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0 truncate">
                  <div className="font-medium text-zinc-900 truncate">
                    {u.name ?? "—"}{" "}
                    {u.isEarlyBird ? (
                      <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        EB
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">
                    {u.email ?? u.id} · {u.role}
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums text-amber-600">
                  {u.coinsBalance?.toLocaleString("de-DE") ?? 0}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Top-10 Spender (kumuliert)
          </div>
          <ul className="divide-y divide-zinc-200">
            {overview.topSpenders.map((s, i) => (
              <li key={s.user?.id ?? i} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0 truncate">
                  <div className="font-medium text-zinc-900 truncate">
                    {s.user?.name ?? "—"}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">
                    {s.user?.email ?? s.user?.id ?? "—"}
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums text-rose-600">
                  -{s.spent.toLocaleString("de-DE")}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Bewegung pro Kind
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="py-2">Kind</th>
                <th className="py-2 text-right">Anzahl Buchungen</th>
                <th className="py-2 text-right">Summe (Coins)</th>
              </tr>
            </thead>
            <tbody>
              {overview.sumsByKind.map((row) => (
                <tr key={row.kind} className="border-b border-zinc-100">
                  <td className="py-2">{COIN_TX_LABELS[row.kind]}</td>
                  <td className="py-2 text-right tabular-nums">{row.count}</td>
                  <td
                    className={`py-2 text-right tabular-nums font-semibold ${
                      row.total >= 0 ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {row.total >= 0 ? "+" : ""}
                    {row.total.toLocaleString("de-DE")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

/* ---------- Transaktionen ---------- */

function TransactionsSection({ tx }: { tx: AdminCoinsTransactionsT }) {
  return (
    <Card title={`Transaktionen (letzte ${tx.transactions.length})`}>
      {tx.transactions.length === 0 ? (
        <div className="text-sm text-zinc-500">Noch keine Buchungen.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="py-2">Datum</th>
                <th className="py-2">User</th>
                <th className="py-2">Kind</th>
                <th className="py-2 text-right">Amount</th>
                <th className="py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {tx.transactions.map((t) => (
                <tr key={t.id} className="border-b border-zinc-100 align-top">
                  <td className="py-2 text-[11px] text-zinc-500 whitespace-nowrap">
                    {new Date(t.createdAt).toLocaleString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </td>
                  <td className="py-2">
                    <div className="font-medium text-zinc-900">
                      {t.user.name ?? "—"}
                    </div>
                    <div className="text-[10px] text-zinc-500">{t.user.email ?? t.user.id}</div>
                  </td>
                  <td className="py-2 text-[11px] text-zinc-700">{COIN_TX_LABELS[t.kind]}</td>
                  <td
                    className={`py-2 text-right text-sm font-semibold tabular-nums ${
                      t.amount >= 0 ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {t.amount >= 0 ? "+" : ""}
                    {t.amount}
                  </td>
                  <td className="py-2 max-w-[260px] truncate text-[11px] text-zinc-500">
                    {t.note ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ---------- Aktive Spends ---------- */

function ActiveSpendsSection({ spends }: { spends: AdminCoinsActiveSpendsT }) {
  if (spends.length === 0) {
    return (
      <Card title="Aktive Spends">
        <div className="text-sm text-zinc-500">Keine aktiven Spends.</div>
      </Card>
    );
  }
  return (
    <Card title={`Aktive Spends (${spends.length})`}>
      <ul className="divide-y divide-zinc-200">
        {spends.map((s) => {
          const remainingMs = new Date(s.validUntil).getTime() - Date.now();
          const remainingDays = Math.max(
            0,
            Math.ceil(remainingMs / (24 * 60 * 60 * 1000))
          );
          return (
            <li key={s.id} className="flex items-start justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium text-zinc-900">
                  {COIN_TX_LABELS[s.kind]}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {s.user.name ?? "—"} ({s.user.email ?? s.user.id}) · {s.user.role}
                </div>
                {s.listing ? (
                  <div className="text-[10px] text-indigo-700">
                    → {s.listing.title} ({s.listing.city})
                  </div>
                ) : null}
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-emerald-700">
                  noch {remainingDays} Tag{remainingDays === 1 ? "" : "e"}
                </div>
                <div className="text-[10px] text-zinc-400">
                  {new Date(s.validUntil).toLocaleDateString("de-DE")}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
