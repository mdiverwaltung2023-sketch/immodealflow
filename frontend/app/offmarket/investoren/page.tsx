import { z } from "zod";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { OffmarketInvestorMatchSchema, OffmarketLeadSchema } from "@/lib/api";
import { InvestorsBrowser } from "./InvestorsBrowser";

export const dynamic = "force-dynamic";

export default async function OffmarketInvestorsPage() {
  await requireOnboardedUser();
  const investors = await apiGet(
    "/offmarket/investors",
    z.array(OffmarketInvestorMatchSchema)
  );
  const myLeads = await apiGet("/me/offmarket-leads", z.array(OffmarketLeadSchema));

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
          Offmarket · Investoren-Pool
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
          Investoren entdecken
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Alle verifizierten Investoren mit aktivem Profil. Wählen Sie das
          Offmarket-Inserat — und laden Sie gezielt ein.
        </p>
      </div>

      <InvestorsBrowser investors={investors} myLeads={myLeads} />
    </div>
  );
}
