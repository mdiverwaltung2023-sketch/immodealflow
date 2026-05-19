import { requireOnboardedUser } from "@/lib/api-server";
import { NotificationsList } from "./NotificationsList";

export const dynamic = "force-dynamic";

export default async function BenachrichtigungenPage() {
  await requireOnboardedUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Benachrichtigungen</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Events rund um deine Inserate, Anfragen und Dokumenten-Freigaben.
        </p>
      </div>
      <NotificationsList />
    </div>
  );
}
