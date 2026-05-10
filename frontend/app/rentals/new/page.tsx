import { requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { RentalUnitForm } from "@/components/RentalUnitForm";

export default async function NewRentalUnitPage() {
  await requireOnboardedUser();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="text-2xl font-semibold text-zinc-900">Neues Mietobjekt</div>
        <div className="mt-1 text-sm text-zinc-500">
          Detaillierte Inserat-Anlage in 6 Abschnitten — Pflichtfelder sind
          Titel, Stadt, Zimmer, Wohnfläche und Kaltmiete. Alles andere
          schärft die KI-Bewerber-Bewertung später.
        </div>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span className="font-semibold">Hinweis AGG:</span> Bitte keine
          diskriminierenden Anforderungen in Beschreibung, Bedingungen oder Tags
          (z. B. zu Herkunft, Religion, Geschlecht, Familienstand).
        </div>
      </div>
      <Card>
        <RentalUnitForm initial={null} mode="create" />
      </Card>
    </div>
  );
}
