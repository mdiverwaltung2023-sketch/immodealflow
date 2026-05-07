import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { AuthHero } from "@/components/AuthHero";

export default async function Home() {
  const a = await auth();
  if (a.userId) {
    redirect("/dashboard");
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <AuthHero headlineLine1="Marketplace für MFH" headlineLine2="und Gewerbe." />

      <div className="flex items-center justify-center bg-zinc-50 p-6 lg:p-10">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center">
            <div className="text-2xl font-semibold text-zinc-900">Loslegen</div>
            <p className="text-sm text-zinc-500">
              Kostenlos registrieren — Profil ausfüllen, Listing einstellen oder
              die ersten Investoren-Inserate durchsuchen.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/sign-up"
              className="block w-full rounded-xl bg-indigo-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Kostenlos registrieren
            </Link>
            <Link
              href="/sign-in"
              className="block w-full rounded-xl border border-zinc-300 bg-white px-5 py-3 text-center text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
            >
              Anmelden
            </Link>
          </div>

          <div className="grid gap-3 pt-4">
            <Bullet title="Für Verkäufer">
              Inserat anlegen, Anonymisierung wählen, nur qualifizierte Anfragen
              durchlassen — Bonität auf einen Blick.
            </Bullet>
            <Bullet title="Für Investoren">
              Profil mit Trackrecord & Bonität, Marketplace durchsuchen, Anfragen
              stellen, Bewertungen sammeln.
            </Bullet>
            <Bullet title="Für beide">
              Auch nutzbar als Investor-Tool: ZVG-Importer, Bietlimit, KI-Marktvergleich.
            </Bullet>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bullet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
        {title}
      </div>
      <div className="mt-1 text-sm text-zinc-600">{children}</div>
    </div>
  );
}
