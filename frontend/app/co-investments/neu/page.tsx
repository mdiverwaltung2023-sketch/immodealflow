import Link from "next/link";
import { requireOnboardedUser } from "@/lib/api-server";
import { NewGesuchForm } from "../NewGesuchForm";

export const dynamic = "force-dynamic";

export default async function NewCoInvestPage() {
  await requireOnboardedUser();

  return (
    <main className="w-full px-4 py-8">
      <Link href="/co-investments" className="text-sm text-teal-700 hover:underline">← Zum Marktplatz</Link>
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-slate-900">Co-Investment-Gesuch anlegen</h1>
        <p className="mt-1 text-sm text-slate-600">
          Wähle, ob du ein konkretes Objekt oder eine allgemeine Suche veröffentlichst. Das Gesuch wird
          als Entwurf gespeichert — anschließend kannst du es im Bereich „Meine Gesuche" veröffentlichen.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <NewGesuchForm redirectOnSuccess />
      </section>
    </main>
  );
}
