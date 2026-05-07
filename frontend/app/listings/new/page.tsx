import { requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { NewListingForm } from "./NewListingForm";
import Link from "next/link";

export default async function NewListingPage() {
  await requireOnboardedUser();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-zinc-900">Neues Listing</div>
          <div className="mt-1 text-sm text-zinc-500">
            Wird als Entwurf angelegt. Bilder, Adresse und Sichtbarkeit pflegst du danach im Edit-Modus.
          </div>
        </div>
        <Link href="/listings" className="text-sm text-zinc-600 hover:text-indigo-700 hover:underline">
          ← Zurück zur Liste
        </Link>
      </div>

      <Card title="Eckdaten">
        <NewListingForm />
      </Card>
    </div>
  );
}
