import { requireOnboardedUser } from "@/lib/api-server";
import { NewLeadWizard } from "./NewLeadWizard";

export const dynamic = "force-dynamic";

export default async function NewOffmarketLeadPage() {
  await requireOnboardedUser();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
          Offmarket-Inserat
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
          Offmarket-Inserat anlegen
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Diskret. Anonym. Sie sehen passende Investoren-Profile sofort.
        </p>
      </div>
      <NewLeadWizard />
    </div>
  );
}
