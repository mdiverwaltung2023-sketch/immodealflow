import Link from "next/link";
import { requireOnboardedUser } from "@/lib/api-server";
import { NewListingForm } from "./NewListingForm";

export default async function NewListingPage() {
  await requireOnboardedUser();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-zinc-900">Inserat anlegen</div>
          <div className="mt-1 text-sm text-zinc-500">
            Pflichtfelder sind <span className="font-semibold">Titel, Asset-Typ, Stadt, Preis, Fläche</span> —
            der Rest ist optional, schärft aber dein Inserat für Investoren.
            Bilder & Sichtbarkeit pflegst du nach dem Anlegen im Edit-Modus.
            <span className="ml-1 text-emerald-700">Inserieren ist kostenlos und unbegrenzt.</span>
          </div>
        </div>
        <Link href="/listings" className="text-sm text-zinc-600 hover:text-indigo-700 hover:underline">
          ← Zurück zur Liste
        </Link>
      </div>

      <NewListingForm />
    </div>
  );
}
