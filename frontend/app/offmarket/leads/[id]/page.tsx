import Link from "next/link";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import {
  OffmarketLeadSchema,
  OffmarketMatchResponseSchema,
  OffmarketInviteStatusEnum,
  OFFMARKET_INVITE_STATUS_LABELS,
  OFFMARKET_LEAD_STATUS_LABELS,
  ASSET_TYPE_LABELS
} from "@/lib/api";
import { z } from "zod";
import { LeadMatchPanel } from "./LeadMatchPanel";
import { LeadStatusActions } from "./LeadStatusActions";

export const dynamic = "force-dynamic";

const DetailWithInvitesSchema = OffmarketLeadSchema.extend({
  invites: z.array(
    z.object({
      id: z.string(),
      createdAt: z.string(),
      status: OffmarketInviteStatusEnum,
      ownerNote: z.string().nullable().optional(),
      investorNote: z.string().nullable().optional(),
      respondedAt: z.string().nullable().optional(),
      investor: z.object({
        id: z.string(),
        name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        role: z.string()
      })
    })
  )
});

export default async function OffmarketLeadDetailPage({
  params
}: {
  params: { id: string };
}) {
  await requireOnboardedUser();
  const lead = await apiGet(`/me/offmarket-leads/${params.id}`, DetailWithInvitesSchema);
  const matchData = await apiGet(
    `/me/offmarket-leads/${params.id}/match`,
    OffmarketMatchResponseSchema
  ).catch(() => null);

  const pendingCount = lead.invites.filter((i) => i.status === "PENDING").length;
  const acceptedCount = lead.invites.filter((i) => i.status === "ACCEPTED").length;
  const declinedCount = lead.invites.filter((i) => i.status === "DECLINED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/offmarket/leads"
            className="text-xs text-zinc-500 hover:text-zinc-700"
          >
            ← Meine Offmarket-Inserate
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            {lead.title}
          </h1>
          <div className="mt-1 text-sm text-zinc-600">
            {ASSET_TYPE_LABELS[lead.propertyType]} · {lead.city}
            {lead.district && ` · ${lead.district}`} · {lead.approxArea} m²
          </div>
        </div>
        <LeadStatusActions leadId={lead.id} currentStatus={lead.status} />
      </div>

      {/* Lead-Card */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/40 to-white p-6">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
          Offmarket · {OFFMARKET_LEAD_STATUS_LABELS[lead.status]}
        </div>
        <div className="mt-3 grid gap-6 lg:grid-cols-3">
          <div>
            <div className="text-[11px] text-zinc-500">Wunschpreis</div>
            <div className="text-2xl font-semibold text-amber-700">
              {lead.approxPrice.toLocaleString("de-DE")} €
            </div>
            {lead.approxRent && (
              <div className="mt-1 text-xs text-zinc-500">
                {lead.approxRent.toLocaleString("de-DE")} €/Mon Miete
              </div>
            )}
          </div>
          <div>
            <div className="text-[11px] text-zinc-500">Anonymisierung</div>
            <div className="text-sm font-medium text-zinc-900">
              {lead.anonymizationLevel === "CITY_ONLY"
                ? "Nur Stadt"
                : lead.anonymizationLevel === "DISTRICT_ONLY"
                  ? "Stadt + Stadtteil"
                  : "Volle Adresse"}
            </div>
            {lead.fullAddress && (
              <div className="mt-1 text-xs text-zinc-500">
                Intern: {lead.fullAddress}
              </div>
            )}
          </div>
          <div>
            <div className="text-[11px] text-zinc-500">Einladungen</div>
            <div className="text-sm font-medium text-zinc-900">
              {lead.invites.length} insgesamt
            </div>
            <div className="mt-1 flex gap-2 text-[11px]">
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">
                {pendingCount} offen
              </span>
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800">
                {acceptedCount} angenommen
              </span>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700">
                {declinedCount} abgelehnt
              </span>
            </div>
          </div>
        </div>
        {lead.description && (
          <div className="mt-4 whitespace-pre-line rounded-lg bg-white/70 p-3 text-sm text-zinc-700">
            {lead.description}
          </div>
        )}
      </div>

      {/* Match-Panel */}
      {matchData && (
        <LeadMatchPanel leadId={lead.id} matches={matchData.matches} />
      )}

      {/* Bestehende Einladungen */}
      {lead.invites.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Versendete Einladungen ({lead.invites.length})
          </h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left">Versendet</th>
                  <th className="px-3 py-2 text-left">Investor</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Antwort</th>
                </tr>
              </thead>
              <tbody>
                {lead.invites.map((i) => (
                  <tr key={i.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2 text-zinc-600">
                      {new Date(i.createdAt).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-3 py-2">
                      {i.status === "ACCEPTED"
                        ? i.investor.name ?? i.investor.email
                        : "verifizierter Investor"}
                    </td>
                    <td className="px-3 py-2">
                      <InviteBadge status={i.status} />
                    </td>
                    <td className="px-3 py-2 text-zinc-600">
                      {i.investorNote ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function InviteBadge({
  status
}: {
  status: keyof typeof OFFMARKET_INVITE_STATUS_LABELS;
}) {
  const color: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    ACCEPTED: "bg-emerald-100 text-emerald-800",
    DECLINED: "bg-zinc-100 text-zinc-600",
    WITHDRAWN: "bg-zinc-100 text-zinc-500",
    EXPIRED: "bg-zinc-100 text-zinc-500"
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${color[status]}`}>
      {OFFMARKET_INVITE_STATUS_LABELS[status]}
    </span>
  );
}
