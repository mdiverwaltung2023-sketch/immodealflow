import { requireOnboardedUser } from "@/lib/api-server";
import { GlobalAccessList } from "./GlobalAccessList";

export const dynamic = "force-dynamic";

export default async function FreigabenPage() {
  await requireOnboardedUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Freigaben</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Alle Dokumenten-Freigaben über alle deine Inserate — wer hat Zugriff,
          wer hat schon geöffnet, was ist abgelaufen.
        </p>
      </div>
      <GlobalAccessList />
    </div>
  );
}
