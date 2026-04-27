import Link from "next/link";
import { z } from "zod";
import { apiGet, PropertyListItemSchema, AUCTION_TYPE_LABELS } from "@/lib/api";
import { Card } from "@/components/ui";

const PropertiesSchema = z.array(PropertyListItemSchema);

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

function daysUntil(iso: string): number {
  const t = new Date(iso).getTime();
  const now = Date.now();
  return Math.round((t - now) / (1000 * 60 * 60 * 24));
}

export default async function AuctionsPage() {
  const all = await apiGet("/properties", PropertiesSchema);
  const auctions = all.filter((p) => p.dealType === "AUCTION" && p.auction);

  // Sortierung: zuerst zukünftige Termine nach Datum aufsteigend, dann ohne Datum, dann vergangene
  auctions.sort((a, b) => {
    const da = a.auction?.auctionDate ? new Date(a.auction.auctionDate).getTime() : null;
    const db = b.auction?.auctionDate ? new Date(b.auction.auctionDate).getTime() : null;
    const now = Date.now();
    const fa = da == null ? 1 : da < now ? 2 : 0;
    const fb = db == null ? 1 : db < now ? 2 : 0;
    if (fa !== fb) return fa - fb;
    if (da != null && db != null) return da - db;
    return 0;
  });

  const upcoming = auctions.filter((p) => p.auction?.auctionDate && new Date(p.auction.auctionDate).getTime() >= Date.now());
  const undated = auctions.filter((p) => !p.auction?.auctionDate);
  const past = auctions.filter((p) => p.auction?.auctionDate && new Date(p.auction.auctionDate).getTime() < Date.now());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Versteigerungen</div>
          <div className="mt-1 text-sm text-zinc-400">
            Zwangsversteigerungen, DGA-, SDL- und andere Auktionstermine. Bietlimit auf Basis deiner Standard-Annahmen.
          </div>
        </div>
        <Link
          href="/auctions/import"
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600"
        >
          Versteigerung importieren
        </Link>
      </div>

      <Card title={`Anstehend (${upcoming.length})`}>
        {upcoming.length === 0 ? (
          <div className="text-sm text-zinc-400">
            Keine anstehenden Termine. <Link className="underline" href="/auctions/import">Termin importieren</Link>.
          </div>
        ) : (
          <AuctionTable rows={upcoming} />
        )}
      </Card>

      {undated.length > 0 ? (
        <Card title={`Ohne Termin (${undated.length})`}>
          <AuctionTable rows={undated} />
        </Card>
      ) : null}

      {past.length > 0 ? (
        <Card title={`Vergangen (${past.length})`}>
          <AuctionTable rows={past} muted />
        </Card>
      ) : null}
    </div>
  );

  function AuctionTable({ rows, muted = false }: { rows: typeof auctions; muted?: boolean }) {
    return (
      <div className="overflow-x-auto rounded-xl border border-zinc-900">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="bg-zinc-950 text-zinc-400">
            <tr>
              <th className="px-3 py-2 font-medium">Termin</th>
              <th className="px-3 py-2 font-medium">Objekt</th>
              <th className="px-3 py-2 font-medium">Lage</th>
              <th className="px-3 py-2 font-medium">Verkehrswert</th>
              <th className="px-3 py-2 font-medium">Bietlimit</th>
              <th className="px-3 py-2 font-medium">Aktenzeichen</th>
              <th className="px-3 py-2 font-medium">Typ</th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-zinc-900 ${muted ? "text-zinc-500" : "text-zinc-200"}`}>
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-950/60">
                <td className="px-3 py-2 whitespace-nowrap">
                  {p.auction?.auctionDate ? (
                    <div>
                      <div>{formatDate(p.auction.auctionDate)}</div>
                      {!muted ? (
                        <div className="text-[10px] text-indigo-400">in {daysUntil(p.auction.auctionDate)} Tagen</div>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/property/${p.id}`} className="font-medium text-white hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="px-3 py-2">{p.location}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {p.auction?.marketValue ? eur(p.auction.marketValue) : <span className="text-zinc-500">—</span>}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {p.auction?.bidLimit ? (
                    <span className="font-semibold text-emerald-400">{eur(p.auction.bidLimit)}</span>
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{p.auction?.caseNumber ?? "—"}</td>
                <td className="px-3 py-2">{AUCTION_TYPE_LABELS[p.auction?.auctionType ?? "ZVG"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}
