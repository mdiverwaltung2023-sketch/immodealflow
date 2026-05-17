import Link from "next/link";
import { OffmarketStatsSchema } from "@/lib/api";
import { z } from "zod";

export const dynamic = "force-dynamic";

async function getStats() {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ?? "";
  if (!url) {
    return { investorCount: 0, preApprovedCount: 0, activeLeadsCount: 0, totalTicketSumEUR: 0 };
  }
  try {
    const res = await fetch(`${url}/offmarket/stats`, { cache: "no-store" });
    if (!res.ok) throw new Error("stats");
    return OffmarketStatsSchema.parse(await res.json());
  } catch {
    return { investorCount: 0, preApprovedCount: 0, activeLeadsCount: 0, totalTicketSumEUR: 0 };
  }
}

export const metadata = {
  title: "Offmarket verkaufen — Infinity Oikos",
  description:
    "Verkaufen ohne öffentliches Listing. Verifizierte Investoren mit geprüfter Finanzierung. Anonym. Diskret. Provisionsfrei für Eigentümer."
};

export default async function OffmarketAkquisePage() {
  const stats = await getStats();

  return (
    <div className="bg-gradient-to-b from-zinc-50 to-white">
      {/* Marketing-Nav */}
      <nav className="border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-8">
          <Link href="/" className="text-base font-semibold text-zinc-900">
            Infinity Oikos
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/sign-in" className="text-zinc-600 hover:text-zinc-900">
              Anmelden
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-700"
            >
              Kostenlos anbieten
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-16 lg:px-8 lg:py-24">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_2px_rgba(245,158,11,0.6)]" />
          Offmarket bei Infinity Oikos
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900 lg:text-6xl">
          Verkaufen ohne dass{" "}
          <span className="text-amber-700">Ihr Nachbar</span>{" "}
          <br className="hidden lg:block" /> es erfährt.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600">
          Klassische Portale maximieren Sichtbarkeit. Offmarket macht das
          Gegenteil: <strong>diskret, anonym, kuratiert</strong>. Verifizierte
          Investoren bewerben sich bei Ihnen — mit nachgewiesener Finanzierung.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/sign-up"
            className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:from-amber-600 hover:to-amber-700"
          >
            Kostenlos & unverbindlich anbieten →
          </Link>
          <Link
            href="/sign-in"
            className="rounded-xl border border-zinc-300 bg-white px-6 py-3 text-base font-medium text-zinc-700 hover:border-zinc-400"
          >
            Bereits Kunde? Anmelden
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat n={stats.investorCount} label="Verifizierte Investoren" />
          <Stat n={stats.preApprovedCount} label="Mit Bankenzusage" />
          <Stat
            n={Math.round(stats.totalTicketSumEUR / 1_000_000)}
            label="Mio € Investitionsvolumen"
            suffix=" Mio"
          />
          <Stat n={stats.activeLeadsCount} label="Offmarket-Inserate aktiv" />
        </div>
      </section>

      {/* Beispiel-Karten mit anonymisierten Bildern */}
      <section className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16 lg:px-8">
          <h2 className="text-2xl font-semibold text-zinc-900 lg:text-3xl">
            So sehen Investoren <span className="text-amber-700">Ihr Objekt</span>.
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Lichtstimmung, Bauform und Atmosphäre bleiben erkennbar — Adresse,
            Hausnummer, Schilder und identifizierbare Details sind unkenntlich.
            Auf Wunsch verwandeln wir Ihr Foto in eine KI-Aquarell-Variante.
          </p>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <DemoCard
              title="MFH · 8 Einheiten"
              location="Hamburg, Eimsbüttel"
              gradient="from-amber-200 via-orange-300 to-rose-400"
              tag="Blur · Sharp"
            />
            <DemoCard
              title="Gewerbeimmobilie"
              location="München, Schwabing"
              gradient="from-sky-200 via-indigo-300 to-violet-400"
              tag="KI-Aquarell"
              watercolor
            />
            <DemoCard
              title="MFH · 12 Einheiten"
              location="Berlin, Charlottenburg"
              gradient="from-emerald-200 via-teal-300 to-cyan-400"
              tag="Blur · Sharp"
            />
          </div>
        </div>
      </section>

      {/* Differenzierung */}
      <section className="border-y border-zinc-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16 lg:px-8">
          <h2 className="text-2xl font-semibold text-zinc-900 lg:text-3xl">
            So unterscheidet sich <span className="text-amber-700">Offmarket</span>{" "}
            von klassischen Portalen
          </h2>
          <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left">Achse</th>
                  <th className="px-4 py-3 text-left">ImmoScout & Co.</th>
                  <th className="px-4 py-3 text-left">Offmarket</th>
                </tr>
              </thead>
              <tbody>
                <Row
                  k="Sichtbarkeit"
                  scout="Maximal öffentlich"
                  off="Maximal diskret — kein Listing, keine SEO"
                />
                <Row
                  k="Initiative"
                  scout="Käufer durchsucht alle Inserate"
                  off="Sie wählen aus, wer Ihr Objekt sieht"
                />
                <Row
                  k="Inventar"
                  scout="Tausende Immobilien"
                  off="Verifizierte Investoren-Profile"
                />
                <Row
                  k="Trust-Signal"
                  scout="Bilder + Texte"
                  off="Bonitätsnachweis + Trackrecord verifiziert"
                />
                <Row
                  k="Tempo"
                  scout="Wochenlange Bieterphasen"
                  off="Direkter, kuratierter Erstkontakt"
                />
                <Row
                  k="Kosten für Sie"
                  scout="Maklerprovision 3,57 %"
                  off="0 € fix, optionale Erfolgsgebühr"
                  highlight
                />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Finanzierungs-USP */}
      <section className="mx-auto max-w-5xl px-4 py-16 lg:px-8">
        <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-10 shadow-sm">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                Der entscheidende Unterschied
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
                Sie sehen, wer wirklich finanzieren kann.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-zinc-700">
                Jeder Investor in unserem Pool zeigt: Eigenkapital,
                Finanzierungs-Vorabprüfung, Ticket-Range und bisherige Deals.
                <strong> Bevor Sie sich offenbaren.</strong>
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                <Check>Schufa / Bankenzusage als Badge</Check>
                <Check>Trackrecord mit verifizierten Abschlüssen</Check>
                <Check>Max. Investitionsvolumen kalkuliert</Check>
                <Check>Asset- und Regions-Präferenzen sichtbar</Check>
              </ul>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-inner">
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">
                Beispiel-Investor-Profil
              </div>
              <div className="mt-2 text-base font-semibold text-zinc-900">
                Verifizierter Investor · 12 Jahre Erfahrung
              </div>
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <div className="text-[11px] font-semibold uppercase text-amber-700">
                  Finanzierungsstärke
                </div>
                <div className="mt-1 text-2xl font-semibold text-amber-900">
                  bis 4,8 Mio €
                </div>
                <div className="mt-1 flex gap-1 flex-wrap">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                    ✓ Finanzierung vorab geprüft
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] ring-1 ring-zinc-200">
                    Sparkasse Berlin, gültig 2026
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                  Mehrfamilienhaus
                </span>
                <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                  Gewerbe
                </span>
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px]">📍 Hamburg</span>
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px]">📍 NRW</span>
              </div>
              <div className="mt-3 rounded-lg bg-zinc-50 p-2 text-[11px]">
                <div className="font-semibold text-zinc-600">Trackrecord</div>
                <div className="mt-1 text-zinc-700">
                  2024 · MFH in Hamburg-Eimsbüttel
                </div>
                <div className="text-zinc-700">2023 · MFH in Berlin-Mitte</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* So funktioniert es */}
      <section className="bg-zinc-50">
        <div className="mx-auto max-w-5xl px-4 py-16 lg:px-8">
          <h2 className="text-2xl font-semibold text-zinc-900 lg:text-3xl">
            In 3 Schritten zum diskreten Verkauf
          </h2>
          <div className="mt-10 grid gap-8 lg:grid-cols-3">
            <Step
              n={1}
              t="Anonymes Offmarket-Inserat"
              d="In 3 Minuten: Eckdaten, Wunschpreis, anonyme Beschreibung. Keine Adresse, kein Foto, keine SEO-Spur."
            />
            <Step
              n={2}
              t="Investoren-Match sehen"
              d="Sofort: Liste passender Investoren-Profile mit Finanzierungsstärke und Trackrecord. Sie entscheiden, wen Sie einladen."
            />
            <Step
              n={3}
              t="Doppel-Freigabe + 1:1-Chat"
              d="Erst wenn Investor + Sie 'Interesse' bestätigen, gibt es Klar-Lage und direkten Chat. Kein Bieterstress, kein Spam."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 lg:text-4xl">
          Sie überlegen ohnehin zu verkaufen?
        </h2>
        <p className="mt-4 text-lg text-zinc-600">
          Legen Sie kostenlos ein anonymes Offmarket-Inserat an und sehen Sie
          binnen Minuten, wer Ihr Objekt wirklich kaufen könnte. Ohne
          Verpflichtung, ohne Maklergebühr, ohne Veröffentlichung.
        </p>
        <Link
          href="/sign-up"
          className="mt-8 inline-block rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:from-amber-600 hover:to-amber-700"
        >
          Kostenlos & anonym anbieten →
        </Link>
        <div className="mt-4 text-xs text-zinc-500">
          DSGVO-konform · Maklererlaubnis § 34c GewO
        </div>
      </section>

      <footer className="border-t border-zinc-200 bg-white px-4 py-6 text-center text-xs text-zinc-500 lg:px-8">
        Infinity Oikos · Offmarket-Bereich ·{" "}
        <a href="mailto:info@infinityoikos.com" className="underline">
          info@infinityoikos.com
        </a>
      </footer>
    </div>
  );
}

function Stat({ n, label, suffix }: { n: number; label: string; suffix?: string }) {
  return (
    <div className="rounded-xl bg-white/70 p-4 ring-1 ring-zinc-200">
      <div className="text-3xl font-semibold text-zinc-900">
        {n}
        {suffix}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function Row({
  k,
  scout,
  off,
  highlight
}: {
  k: string;
  scout: string;
  off: string;
  highlight?: boolean;
}) {
  return (
    <tr className="border-t border-zinc-100">
      <td className="px-4 py-3 font-semibold text-zinc-700">{k}</td>
      <td className="px-4 py-3 text-zinc-500">{scout}</td>
      <td className={`px-4 py-3 ${highlight ? "font-semibold text-amber-700" : "text-zinc-900"}`}>
        {off}
      </td>
    </tr>
  );
}

function Step({ n, t, d }: { n: number; t: string; d: string }) {
  return (
    <div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-base font-semibold text-amber-800">
        {n}
      </div>
      <h3 className="mt-3 text-lg font-semibold text-zinc-900">{t}</h3>
      <p className="mt-2 text-sm text-zinc-600">{d}</p>
    </div>
  );
}

function DemoCard({
  title,
  location,
  gradient,
  tag,
  watercolor
}: {
  title: string;
  location: string;
  gradient: string;
  tag: string;
  watercolor?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3] overflow-hidden">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradient}`}
          style={
            watercolor
              ? {
                  backgroundImage: `radial-gradient(at 20% 30%, rgba(255,255,255,0.5), transparent 50%), radial-gradient(at 80% 70%, rgba(255,200,150,0.4), transparent 50%)`,
                  filter: "blur(3px) saturate(1.3)"
                }
              : { filter: "blur(20px) saturate(1.2)" }
          }
        />
        {/* Pseudo-Architektur-Silhouette */}
        <svg
          className="absolute inset-0 h-full w-full opacity-40"
          viewBox="0 0 400 300"
          preserveAspectRatio="none"
        >
          <rect x="60" y="120" width="280" height="160" fill="rgba(40,30,20,0.45)" />
          <rect x="100" y="150" width="40" height="40" fill="rgba(255,250,230,0.55)" />
          <rect x="170" y="150" width="40" height="40" fill="rgba(255,250,230,0.55)" />
          <rect x="240" y="150" width="40" height="40" fill="rgba(255,250,230,0.55)" />
          <rect x="100" y="210" width="40" height="40" fill="rgba(255,250,230,0.55)" />
          <rect x="170" y="210" width="40" height="40" fill="rgba(255,250,230,0.55)" />
          <rect x="240" y="210" width="40" height="40" fill="rgba(255,250,230,0.55)" />
          <polygon
            points="50,120 200,40 350,120"
            fill="rgba(60,40,30,0.55)"
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-amber-900/15 via-transparent to-zinc-900/15" />
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-zinc-900/60 px-2.5 py-1 backdrop-blur-sm">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_1px_rgba(251,191,36,0.8)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
            Offmarket
          </span>
        </div>
        <div className="absolute bottom-2 right-2 rounded-full bg-zinc-900/55 px-2 py-0.5 text-[10px] text-zinc-100 backdrop-blur-sm">
          {tag}
        </div>
      </div>
      <div className="p-4">
        <div className="text-sm font-semibold text-zinc-900">{title}</div>
        <div className="mt-0.5 text-xs text-zinc-500">{location}</div>
      </div>
    </div>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-zinc-700">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        className="mt-0.5 text-emerald-600"
      >
        <path d="M5 12l5 5L20 7" />
      </svg>
      <span>{children}</span>
    </li>
  );
}
