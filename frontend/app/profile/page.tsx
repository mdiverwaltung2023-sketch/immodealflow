import { InvestorProfileSchema } from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { ProfileEditor } from "./ProfileEditor";

export default async function ProfilePage() {
  const me = await requireOnboardedUser();
  const profile = await apiGet("/me/profile", InvestorProfileSchema);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Mein Profil</div>
        <div className="mt-1 text-sm text-zinc-400">
          Investor-Profil und Trackrecord. Verkäufer sehen diese Daten nur, wenn deine
          Sichtbarkeit das erlaubt — und je nach Stufe erst nach einer Anfrage.
        </div>
      </div>

      <ProfileEditor initial={profile} userName={me.name ?? null} userRole={me.role} />
    </div>
  );
}
