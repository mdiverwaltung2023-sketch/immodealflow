import { z } from "zod";
import Link from "next/link";
import { ListingSchema } from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { NewListingForm } from "./NewListingForm";

const ListingsArraySchema = z.array(ListingSchema);

export default async function NewListingPage() {
  const me = await requireOnboardedUser();

  // Free-Plan-Limit: 1 aktives Listing. Hinweis-Banner anzeigen wenn schon
  // mindestens eines vorhanden ist.
  const myListings = await apiGet("/me/listings", ListingsArraySchema).catch(() => []);
  const activeCount = myListings.filter((l) => l.status === "ACTIVE").length;
  const isFree = (me.plan ?? "FREE") === "FREE";
  const overFreeLimit = isFree && activeCount >= 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-zinc-900">Inserat anlegen</div>
          <div className="mt-1 text-sm text-zinc-500">
            Pflichtfelder sind <span className="font-semibold">Titel, Asset-Typ, Stadt, Preis, Fläche</span> —
            der Rest ist optional, schärft aber dein Inserat für Investoren.
            Bilder & Sichtbarkeit pflegst du nach dem Anlegen im Edit-Modus.
          </div>
        </div>
        <Link href="/listings" className="text-sm text-zinc-600 hover:text-indigo-700 hover:underline">
          ← Zurück zur Liste
        </Link>
      </div>

      {overFreeLimit ? (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-amber-900">
                Free-Plan: 1 aktives Inserat erreicht ({activeCount} aktiv)
              </div>
              <p className="mt-1 text-xs text-amber-800">
                Du kannst weitere Inserate als <span className="font-semibold">Entwurf</span> anlegen,
                sie aber erst aktivieren, wenn du das aktuelle archivierst — oder auf{" "}
                <span className="font-semibold">Verkäufer Pro</span> upgradest (bis zu 10 aktive
                Inserate plus Premium-Sichtbarkeit).
              </p>
              <Link
                href="/pricing"
                className="mt-3 inline-block rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
              >
                Verkäufer Pro ansehen →
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <NewListingForm />
    </div>
  );
}
