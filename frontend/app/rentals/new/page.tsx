import { requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { NewRentalUnitForm } from "./NewRentalUnitForm";

export default async function NewRentalUnitPage() {
  await requireOnboardedUser();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="text-2xl font-semibold text-zinc-900">Neues Mietobjekt</div>
        <div className="mt-1 text-sm text-zinc-500">
          Trag die wichtigsten Eckdaten ein — Details kannst du danach im Detail-Editor
          ergänzen, inkl. Bilder und Bewerber.
        </div>
      </div>
      <Card title="Eckdaten">
        <NewRentalUnitForm />
      </Card>
    </div>
  );
}
