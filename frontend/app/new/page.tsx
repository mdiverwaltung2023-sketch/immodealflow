import { requireOnboardedUser } from "@/lib/api-server";
import { NewPropertyForm } from "./NewPropertyForm";

export default async function NewPropertyPage() {
  await requireOnboardedUser();

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-zinc-900">Neues Objekt</div>
        <div className="mt-1 text-sm text-zinc-500">
          Lege ein Objekt an. Danach kannst du analysieren und ein Angebot generieren.
        </div>
      </div>

      <NewPropertyForm />
    </div>
  );
}
