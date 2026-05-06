import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const a = await auth();
  if (a.userId) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-12 py-8">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">DealFlow AI</h1>
        <p className="mx-auto max-w-xl text-zinc-400">
          Immobilien-Deals analysieren, Versteigerungen tracken, Bietlimits berechnen — und bald: ein Marketplace
          für MFH und Gewerbe, in dem Verkäufer auf transparente Käufer-Profile zugreifen.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/sign-up"
            className="rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-600"
          >
            Kostenlos registrieren
          </Link>
          <Link
            href="/sign-in"
            className="rounded-xl border border-zinc-800 px-5 py-3 text-sm font-medium text-zinc-200 hover:border-zinc-700 hover:text-white"
          >
            Anmelden
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Feature
          title="Pipeline + Analyse"
          body="Status-Pipeline, mehrere Analyse-Szenarien mit Kaufnebenkosten, Tilgung, AfA, Steuer und Cashflow nach Steuer."
        />
        <Feature
          title="Versteigerungs-Importer"
          body="ZVG-Bekanntmachungen per PDF/URL importieren, automatisches Bietlimit auf Basis deiner Annahmen."
        />
        <Feature
          title="KI-Magie"
          body="Inserat-Text in Sekunden zu strukturierten Feldern, Marktvergleich pro Lage, Preisvorschlag + Anschreiben via Claude."
        />
      </div>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border bg-zinc-950/40 p-5">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm text-zinc-400">{body}</div>
    </div>
  );
}
