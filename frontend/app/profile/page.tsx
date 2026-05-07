import { InvestorProfileSchema, RatingsReceivedResponseSchema } from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { StarSummary } from "@/components/StarRating";
import { ProfileEditor } from "./ProfileEditor";

export default async function ProfilePage() {
  const me = await requireOnboardedUser();
  const [profile, ratings] = await Promise.all([
    apiGet("/me/profile", InvestorProfileSchema),
    apiGet("/me/ratings/received", RatingsReceivedResponseSchema)
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-zinc-900">Mein Profil</div>
        <div className="mt-1 text-sm text-zinc-500">
          Investor-Profil und Trackrecord. Verkäufer sehen diese Daten nur, wenn deine
          Sichtbarkeit das erlaubt — und je nach Stufe erst nach einer Anfrage.
        </div>
      </div>

      <Card title="Bewertungen über mich">
        <div className="flex flex-wrap items-center gap-3">
          <StarSummary summary={ratings.summary} size="lg" />
        </div>
        {ratings.ratings.length > 0 ? (
          <div className="mt-4 divide-y divide-zinc-200">
            {ratings.ratings.map((r) => (
              <div key={r.id} className="space-y-2 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-amber-500 text-sm">
                    {"★".repeat(r.stars)}
                    <span className="text-zinc-300">{"★".repeat(5 - r.stars)}</span>
                  </div>
                  <span className="text-xs text-zinc-600">
                    von {r.fromUser.name ?? "Anonym"}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {new Date(r.createdAt).toLocaleDateString("de-DE")}
                  </span>
                </div>
                <div className="text-xs text-zinc-500">
                  Deal: {r.inquiry.listing.title} ({r.inquiry.listing.city})
                </div>
                <div className="whitespace-pre-wrap text-sm text-zinc-700">{r.body}</div>
                {r.rebuttal ? (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">
                      Deine Gegendarstellung
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{r.rebuttal}</div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-zinc-500">
            Bewertungen sind nach abgeschlossenen Deals (Listing-Status: Verkauft) möglich.
          </div>
        )}
      </Card>

      <ProfileEditor initial={profile} userName={me.name ?? null} userRole={me.role} />
    </div>
  );
}
