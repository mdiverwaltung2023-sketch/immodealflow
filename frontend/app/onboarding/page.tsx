import { redirect } from "next/navigation";
import { MeSchema } from "@/lib/api";
import { apiGet } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const me = await apiGet("/me", MeSchema);
  if (me.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="text-2xl font-semibold">Willkommen bei DealFlow AI</div>
        <div className="mt-1 text-sm text-zinc-400">
          {me.name ? `Hallo ${me.name}, ` : "Hallo, "}
          bevor du loslegst, brauchen wir kurz deine Rolle. Das hilft uns,
          dir die richtigen Funktionen anzuzeigen — und ist später Voraussetzung
          dafür, dass Verkäufer dein Investor-Profil sehen können.
        </div>
      </div>

      <Card title="Wofür nutzt du DealFlow AI?">
        <OnboardingForm initial={{ name: me.name ?? "", role: me.role }} />
      </Card>

      <div className="text-xs text-zinc-500">
        Die Auswahl kannst du später jederzeit ändern.
      </div>
    </div>
  );
}
