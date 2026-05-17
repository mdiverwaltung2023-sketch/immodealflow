import Link from "next/link";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { OffmarketStatsSchema } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function OffmarketHubPage() {
  const me = await requireOnboardedUser();
  const stats = await apiGet("/offmarket/stats", OffmarketStatsSchema).catch(
    () => ({ investorCount: 0, preApprovedCount: 0, activeLeadsCount: 0, totalTicketSumEUR: 0 })
  );

  const sellerCard = (
    <Link
      href="/offmarket/leads/neu"
      className="group rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 transition hover:shadow-md"
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
        Verkaufen — diskret
      </div>
      <h3 className="mt-2 text-xl font-semibold text-zinc-900">
        Offmarket-Inserat anlegen
      </h3>
      <p className="mt-2 text-sm text-zinc-600">
        Ihr Objekt wird NIE öffentlich gelistet. Sie sehen passende Investoren-Profile
        zuerst — und entscheiden selbst, wem Sie sich offenbaren.
      </p>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-amber-700 group-hover:gap-2 transition-all">
        In 3 Minuten startklar →
      </div>
    </Link>
  );

  const investorCard = (
    <Link
      href="/offmarket/einladungen"
      className="group rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 transition hover:shadow-md"
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
        Investieren — vorab
      </div>
      <h3 className="mt-2 text-xl font-semibold text-zinc-900">
        Offmarket-Einladungen
      </h3>
      <p className="mt-2 text-sm text-zinc-600">
        Eigentümer wählen Sie persönlich aus. Sie sehen Objekte, die NIE im
        Marketplace erscheinen — bevor andere überhaupt davon erfahren.
      </p>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 group-hover:gap-2 transition-all">
        Posteingang öffnen →
      </div>
    </Link>
  );

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_1px_rgba(245,158,11,0.6)]" />
          Offmarket bei Infinity Oikos
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 lg:text-4xl">
          Verkaufen ohne öffentliches Listing.
          <br />
          <span className="text-amber-700">
            Investoren-Profile zuerst sehen — Sie entscheiden.
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Klassische Portale maximieren Sichtbarkeit. Offmarket macht das
          Gegenteil: maximale Diskretion, kuratierte Investoren-Matches,
          Finanzierungsstärke transparent — bevor Sie sich offenbaren.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat
            label="Verifizierte Investoren"
            value={stats.investorCount.toString()}
          />
          <Stat
            label="Mit Finanzierungs-Vorabprüfung"
            value={stats.preApprovedCount.toString()}
          />
          <Stat
            label="Aktive Offmarket-Inserate"
            value={stats.activeLeadsCount.toString()}
          />
          <Stat
            label="Investitionsvolumen gesamt"
            value={`${Math.round(stats.totalTicketSumEUR / 1_000_000)} Mio €`}
          />
        </div>
      </div>

      {/* Rollen-CTAs */}
      <div className="grid gap-4 lg:grid-cols-2">
        {me.role === "INVESTOR" ? (
          <>
            {investorCard}
            {sellerCard}
          </>
        ) : (
          <>
            {sellerCard}
            {investorCard}
          </>
        )}
      </div>

      {/* So funktioniert Offmarket */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-zinc-900">
          So funktioniert Offmarket
        </h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          <Step
            n={1}
            title="Anonymes Offmarket-Inserat"
            text="Sie legen Eckdaten + Wunschpreis an. Adresse + Identität bleiben privat. Kein Foto Pflicht."
          />
          <Step
            n={2}
            title="Reverse-Match"
            text="Sie sehen passende Investoren-Profile — mit Trackrecord und Finanzierungsstärke — vor jedem Kontakt."
          />
          <Step
            n={3}
            title="Doppel-Freigabe"
            text="Erst wenn Investor + Sie 'Interesse' bestätigen, werden Adresse und Kontakt freigeschaltet. Dann geht es in den Chat."
          />
        </div>
      </div>

      {/* Hinweis fuer Brand-Wert "Offmarket" */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
        <strong>Wichtig:</strong> Offmarket-Inserate erscheinen <em>nicht</em> im
        öffentlichen <Link href="/marketplace" className="underline">Marketplace</Link>{" "}
        — und werden auch nicht über Suchmaschinen gefunden. Das normale Portal
        steht für Sie wie gewohnt zur Verfügung.
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 px-4 py-3">
      <div className="text-2xl font-semibold text-zinc-900">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
    </div>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800">
          {n}
        </div>
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      </div>
      <p className="mt-2 ml-11 text-sm text-zinc-600">{text}</p>
    </div>
  );
}
