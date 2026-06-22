import {
  BillingStateSchema,
  InvestorProfileSchema,
  RatingsReceivedResponseSchema,
  TenantProfileSchema,
  TrustScoreSchema
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { StarSummary } from "@/components/StarRating";
import { ProfileEditor } from "./ProfileEditor";
import { TenantProfileEditor } from "./TenantProfileEditor";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { BillingCard } from "./BillingCard";
import { TrustScorePanel } from "./TrustScorePanel";

export default async function ProfilePage() {
  const me = await requireOnboardedUser();
  const [investorProfile, tenantProfile, ratings, billing, trust] = await Promise.all([
    apiGet("/me/profile", InvestorProfileSchema),
    apiGet("/me/tenant-profile", TenantProfileSchema),
    apiGet("/me/ratings/received", RatingsReceivedResponseSchema),
    apiGet("/me/billing", BillingStateSchema).catch(() => ({
      plan: "FREE" as const,
      planValidUntil: null,
      hasSubscription: false,
      stripeReady: false
    })),
    apiGet("/me/trust-score", TrustScoreSchema).catch(() => null)
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-zinc-900">Mein Profil</div>
        <div className="mt-1 text-sm text-zinc-500">
          Investor-Profil und Mieter-Profil — getrennt verwaltbar. Welcher
          Block sichtbar ist, hängt von deiner aktiven Sicht oben (Topbar)
          ab. Multi-Rollen können beide Profile pflegen.
        </div>
      </div>

      {me.isFoundingMember ? (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-white p-4">
          <span className="text-2xl">🏅</span>
          <div>
            <div className="font-semibold text-amber-900">
              Oikos Investor Club — Gründungsmitglied{me.foundingMemberNo ? ` #${me.foundingMemberNo}` : ""}
            </div>
            <div className="text-sm text-amber-800">
              Dauerhaft kostenloser Zugang als Gründungsmitglied — danke, dass du von Anfang an dabei bist.
            </div>
          </div>
        </div>
      ) : null}

      <BillingCard billing={billing} />

      {trust ? <TrustScorePanel trust={trust} /> : null}

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

      <ProfileSwitcher
        userRole={me.role}
        investorEditor={
          <ProfileEditor
            initial={investorProfile}
            userName={me.name ?? null}
            userRole={me.role}
          />
        }
        tenantEditor={<TenantProfileEditor initial={tenantProfile} />}
      />
    </div>
  );
}
