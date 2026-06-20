import { redirect } from "next/navigation";
import { z } from "zod";
import {
  FinancingLeadSchema,
  FINANCING_PARTNER_TYPE_LABELS,
  FINANCING_REQUEST_STATUS_LABELS,
  type FinancingLeadT
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const ListSchema = z.array(FinancingLeadSchema);

function eur(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}
function fmt(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  } catch {
    return iso;
  }
}

export default async function AdminFinancingLeadsPage() {
  const me = await requireOnboardedUser();
  if (!me.isAdmin) {
    redirect("/dashboard");
  }
  const leads = await apiGet("/admin/financing-leads", ListSchema).catch(
    () => [] as FinancingLeadT[]
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-zinc-900">Finanzierungs-Leads</div>
        <div className="mt-1 text-sm text-zinc-500">
          An Partner übergebene Finanzierungsanfragen (Tippgeber-Tracking) — zum Nachverfolgen
          und Weiterleiten an den jeweiligen Partner.
        </div>
      </div>

      <Card title={`Übergebene Anfragen (${leads.length})`}>
        {leads.length === 0 ? (
          <div className="text-sm text-zinc-500">Noch keine Lead-Übergaben.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Datum</th>
                  <th className="px-3 py-2 font-medium">Investor</th>
                  <th className="px-3 py-2 font-medium">Objekt</th>
                  <th className="px-3 py-2 font-medium">Wunsch-Darlehen</th>
                  <th className="px-3 py-2 font-medium">Partner</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {leads.map((l) => (
                  <tr key={l.id} className="align-top hover:bg-zinc-50">
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-500">{fmt(l.handedOffAt)}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-zinc-900">{l.owner?.name ?? "—"}</div>
                      <div className="text-xs text-zinc-500">{l.owner?.email}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-zinc-900">{l.property?.title ?? "—"}</div>
                      <div className="text-xs text-zinc-500">{l.property?.location}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {eur(l.desiredLoanAmount)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-zinc-900">{l.partner?.name ?? "—"}</div>
                      <div className="text-xs text-zinc-500">
                        {l.partner ? FINANCING_PARTNER_TYPE_LABELS[l.partner.type] : ""}
                        {l.partner?.contactEmail ? ` · ${l.partner.contactEmail}` : ""}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {FINANCING_REQUEST_STATUS_LABELS[l.status]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
