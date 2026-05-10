import { redirect } from "next/navigation";
import { z } from "zod";
import {
  BrokerLeadSchema,
  BROKER_LEAD_STATUS_LABELS,
  type BrokerLeadStatusT,
  type BrokerLeadT
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { LeadList } from "./LeadList";

export const dynamic = "force-dynamic";

const ListSchema = z.array(BrokerLeadSchema);

export default async function AdminBrokerLeadsPage() {
  const me = await requireOnboardedUser();
  if (!me.isAdmin) {
    redirect("/dashboard");
  }

  const leads = await apiGet("/admin/broker-leads", ListSchema).catch(
    () => [] as BrokerLeadT[]
  );

  const counts: Record<BrokerLeadStatusT | "ALL", number> = {
    ALL: leads.length,
    NEW: 0,
    CONTACTED: 0,
    QUALIFIED: 0,
    CLOSED_WON: 0,
    CLOSED_LOST: 0
  };
  leads.forEach((l) => counts[l.status]++);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-zinc-900">
          Admin · Makler-Leads
        </div>
        <div className="mt-1 text-sm text-zinc-500">
          Anfragen aus dem Verkaufsberater. Status pflegen, interne Notizen
          ablegen, Kontakt aufnehmen.
        </div>
      </div>

      <Card title="Status-Übersicht">
        <div className="flex flex-wrap gap-2">
          <StatusPill label="Alle" count={counts.ALL} />
          {(Object.keys(BROKER_LEAD_STATUS_LABELS) as BrokerLeadStatusT[]).map((s) => (
            <StatusPill key={s} label={BROKER_LEAD_STATUS_LABELS[s]} count={counts[s]} />
          ))}
        </div>
      </Card>

      <LeadList initial={leads} />
    </div>
  );
}

function StatusPill({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600">
      {label}: <span className="font-semibold text-zinc-900">{count}</span>
    </div>
  );
}
