import { requireOnboardedUser } from "@/lib/api-server";
import { ReceivedAccessList } from "./ReceivedAccessList";

export const dynamic = "force-dynamic";

export default async function EmpfangeneFreigabenPage() {
  await requireOnboardedUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Erhaltene Unterlagen</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Inserate, deren Verkäufer dir Dokumente direkt in der App
          freigegeben hat. Kein Token-Link nötig.
        </p>
      </div>
      <ReceivedAccessList />
    </div>
  );
}
