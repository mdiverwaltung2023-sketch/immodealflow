import Link from "next/link";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { OffmarketLeadSchema } from "@/lib/api";
import { EditLeadForm } from "./EditLeadForm";

export const dynamic = "force-dynamic";

export default async function EditOffmarketLeadPage({
  params
}: {
  params: { id: string };
}) {
  await requireOnboardedUser();
  const lead = await apiGet(`/me/offmarket-leads/${params.id}`, OffmarketLeadSchema);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/offmarket/leads/${lead.id}`}
        className="text-xs text-zinc-500 hover:text-zinc-700"
      >
        ← Zurück zum Inserat
      </Link>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
          Offmarket-Inserat bearbeiten
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
          {lead.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Alle Felder kannst du nachträglich ändern. Auch die Anonymisierungsstufe.
        </p>
      </div>
      <EditLeadForm lead={lead} />
    </div>
  );
}
