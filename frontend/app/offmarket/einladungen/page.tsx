import Link from "next/link";
import { z } from "zod";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import {
  OffmarketInviteListItemSchema,
  OFFMARKET_INVITE_STATUS_LABELS,
  ASSET_TYPE_LABELS
} from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function OffmarketInvitesPage() {
  await requireOnboardedUser();
  const invites = await apiGet(
    "/me/offmarket-invites",
    z.array(OffmarketInviteListItemSchema)
  );

  const pending = invites.filter((i) => i.status === "PENDING");
  const others = invites.filter((i) => i.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
          Offmarket · Vorab-Zugang
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
          Meine Offmarket-Einladungen
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Eigentümer haben Sie persönlich für diese Objekte ausgewählt. Sie
          entscheiden, ob Sie sich offenbaren wollen — und dann freigeschaltet
          werden.
        </p>
      </div>

      {invites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <div className="text-sm text-zinc-500">
            Sie haben noch keine Offmarket-Einladungen erhalten.
          </div>
          <div className="mt-2 text-xs text-zinc-400">
            Vervollständigen Sie Ihr{" "}
            <Link href="/profile" className="underline">
              Investor-Profil
            </Link>{" "}
            (insb. Finanzierung + Trackrecord), damit Eigentümer Sie matchen
            können.
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-700">
                Offen ({pending.length})
              </h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {pending.map((i) => (
                  <InviteCard key={i.id} invite={i} />
                ))}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Bearbeitet ({others.length})
              </h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {others.map((i) => (
                  <InviteCard key={i.id} invite={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InviteCard({
  invite
}: {
  invite: import("@/lib/api").OffmarketInviteListItemT;
}) {
  const lead = invite.lead as {
    id: string;
    title: string;
    propertyType: string;
    approxArea: number;
    approxPrice: number;
    approxRent?: number | null;
    location?: string;
    city: string;
    description: string;
    highlights?: string[];
  };
  const statusColor: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    ACCEPTED: "bg-emerald-100 text-emerald-800",
    DECLINED: "bg-zinc-100 text-zinc-600",
    WITHDRAWN: "bg-zinc-100 text-zinc-500",
    EXPIRED: "bg-zinc-100 text-zinc-500"
  };

  return (
    <Link
      href={`/offmarket/einladungen/${invite.id}`}
      className="block rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-amber-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">{lead.title}</h3>
          <div className="mt-0.5 text-xs text-zinc-500">
            {ASSET_TYPE_LABELS[lead.propertyType as keyof typeof ASSET_TYPE_LABELS]} ·{" "}
            {lead.location ?? lead.city} · {lead.approxArea} m²
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColor[invite.status]}`}
        >
          {OFFMARKET_INVITE_STATUS_LABELS[invite.status]}
        </span>
      </div>
      <div className="mt-3 text-xl font-semibold text-amber-700">
        {lead.approxPrice.toLocaleString("de-DE")} €
        {lead.approxRent && (
          <span className="ml-2 text-xs font-normal text-zinc-500">
            · {lead.approxRent.toLocaleString("de-DE")} € Miete/Mon
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{lead.description}</p>
      {invite.ownerNote && (
        <div className="mt-3 rounded-lg bg-amber-50/60 p-2 text-xs italic text-amber-900">
          "{invite.ownerNote}"
        </div>
      )}
    </Link>
  );
}
