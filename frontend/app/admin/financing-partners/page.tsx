import { redirect } from "next/navigation";
import { z } from "zod";
import { FinancingPartnerSchema, type FinancingPartnerT } from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { PartnerManager } from "./PartnerManager";

export const dynamic = "force-dynamic";

const ListSchema = z.array(FinancingPartnerSchema);

export default async function AdminFinancingPartnersPage() {
  const me = await requireOnboardedUser();
  if (!me.isAdmin) {
    redirect("/dashboard");
  }
  const partners = await apiGet("/admin/financing-partners", ListSchema).catch(
    () => [] as FinancingPartnerT[]
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-zinc-900">Finanzierungspartner</div>
        <div className="mt-1 text-sm text-zinc-500">
          Verzeichnis für das neutrale, kriterienbasierte Partner-Matching (Tippgeber — keine
          Vermittlung durch Oikos).
        </div>
      </div>
      <Card title={`Partner (${partners.length})`}>
        <PartnerManager initial={partners} />
      </Card>
    </div>
  );
}
