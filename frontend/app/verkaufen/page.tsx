import Link from "next/link";
import { GeometricBackground } from "../(marketing)/components/GeometricBackground";
import { AdvisorWizard } from "../(marketing)/components/AdvisorWizard";
import {
  TrustStrip,
  StepsBlock,
  MiniFaq,
  FooterCta,
  MarketingFooter,
  MarketingNav
} from "../(marketing)/components/MarketingSections";

/**
 * Phase L11 — Verkaufsberater-Landing-Page (/verkaufen).
 *
 * Conversion-Hook: lokal gerechneter Wizard direkt im Hero. User
 * gibt 8 Eckdaten ein -> bekommt sofort Empfehlung (Selbst / Hybrid /
 * Makler) mit Score, Begründung, Provisions-Ersparnis und CTA.
 *
 * KEINE Auth-Prüfung — die Page soll auch eingeloggte Eigentümer
 * gleich ins Tool führen, ohne Redirect-Loop.
 */
export default function SalesAdvisorLandingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <MarketingNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <GeometricBackground />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              KI-Verkaufsberater
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Selbst verkaufen oder Makler beauftragen?
            </h1>
            <p className="mt-4 max-w-xl text-base text-zinc-600">
              Datengetriebene Empfehlung in 30 Sekunden — auf Basis von Objektart,
              Lage, Zustand, Zeitrahmen und deiner Erfahrung. Wir sagen dir
              ehrlich, ob du einen Makler brauchst — oder eben nicht.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="#advisor-form"
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                Empfehlung starten
              </Link>
              <Link
                href="/pricing"
                className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-white/80"
              >
                Verkaufs-Tools im Investor Club
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
              <span>✓ Kostenlos · ohne Anmeldung</span>
              <span>✓ Neutrale Empfehlung — kein Sales-Talk</span>
              <span>✓ KI + transparente Heuristik</span>
            </div>
          </div>

          <div id="advisor-form" className="flex items-center">
            <div className="w-full">
              <AdvisorWizard />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="mx-auto max-w-6xl px-4 -mt-8">
        <TrustStrip
          stats={[
            { big: "3 Pfade", small: "Selbst · Hybrid · Makler — nachvollziehbar bewertet" },
            { big: "0 Sales-Pitch", small: "Wir empfehlen Makler nur, wenn er wirklich nötig ist" },
            { big: "~3,57 %", small: "Ø-Provision in DE — Ersparnis-Schätzung pro Empfehlung" }
          ]}
        />
      </section>

      {/* ZWEI SZENARIEN */}
      <section className="mx-auto max-w-5xl space-y-8 px-4 py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Zwei Pfade. Eine ehrliche Empfehlung.
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          <PathCard
            tone="emerald"
            dot="🟢"
            title="Selbstvermarktung"
            subtitle="Du verkaufst selbst — die Plattform liefert das Werkzeug."
            bullets={[
              "KI-Preisstrategie auf Basis Mietspiegel + Marktdaten",
              "Exposé-Generator (Beschreibung, Zielgruppen-Tags)",
              "Käufer-Bonitäts-Check vor jeder Besichtigung",
              "Verhandlungs-Spickzettel mit Argumenten und Limits",
              "Premium-Sichtbarkeit als One-off (Featured-Listing)"
            ]}
            ctaLabel="Investor Club ansehen"
            ctaHref="/pricing"
          />
          <PathCard
            tone="rose"
            dot="🔴"
            title="Makler empfohlen"
            subtitle="Komplexer Fall. Erfahrener Profi macht den Unterschied."
            bullets={[
              "Direkte Vermittlung an einen erfahrenen Makler",
              "Wir melden uns innerhalb von 24 Stunden",
              "Adresse + Eckdaten — keine Massenanfragen",
              "Wir empfehlen Makler nur, wenn die KI ihn wirklich rät"
            ]}
            ctaLabel="Im Wizard anfordern"
            ctaHref="#advisor-form"
          />
        </div>
      </section>

      {/* WIE FUNKTIONIERT'S */}
      <div className="bg-white py-20">
        <StepsBlock
          title="So funktioniert die Empfehlung."
          steps={[
            {
              num: 1,
              title: "8 Eckdaten",
              desc: "Objektart, Lage, Zustand, Belegung, Anlass, Zeitrahmen, Erfahrung, geschätzter Wert."
            },
            {
              num: 2,
              title: "Transparente Bewertung",
              desc: "Jeder Faktor liefert einen Score-Beitrag — sichtbar, nachvollziehbar, keine Black Box."
            },
            {
              num: 3,
              title: "Eine klare Empfehlung",
              desc: "Selbst / Hybrid / Makler — mit Pro- und Contra-Argumenten und nächstem konkreten Schritt."
            }
          ]}
        />
      </div>

      {/* WARUM NEUTRAL */}
      <section className="mx-auto max-w-4xl px-4 py-20">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white shadow-xl sm:p-10">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
            Unsere Versprechen
          </div>
          <h3 className="mt-2 text-2xl font-semibold">
            Wir verdienen nur, wenn der Pfad zu dir passt.
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-indigo-100">
            <Promise>
              Bei Selbstvermarktung verdienen wir am Investor-Club-Abo (19 €/Monat) —
              keine Provision auf den Kaufpreis.
            </Promise>
            <Promise>
              Bei Makler-Empfehlung übernimmt ein erfahrener Makler aus unserem Haus
              die Vermarktung — Provision wird transparent vor Auftragserteilung
              verhandelt.
            </Promise>
            <Promise>
              Wir empfehlen niemals einen Makler, wenn die Heuristik ihn nicht wirklich
              empfiehlt. Auch nicht „zur Sicherheit".
            </Promise>
            <Promise>
              Deine Daten bleiben bei uns — keine Weitergabe an Dritte, kein Spam,
              keine Massenkampagnen.
            </Promise>
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <div className="bg-white py-20">
        <MiniFaq
          title="Was Eigentümer fragen."
          items={[
            {
              q: "Wie kann eine KI das wirklich beurteilen?",
              a: "Sie kann es nicht allein. Deshalb nutzt unser Tool eine transparente Heuristik aus 8 Faktoren — jeder mit nachvollziehbarem Score-Beitrag. Im Investor Club ergänzt Claude die Empfehlung mit Mikromarkt-Daten und Vergleichs-Deals."
            },
            {
              q: "Wieviel kann ich durch Eigenvermarktung sparen?",
              a: "Bei Ø 3,57 % Maklerprovision in Deutschland sind das bei einem 500.000-€-Objekt rund 17.850 € — geteilt zwischen Käufer und Verkäufer (typisch ~9.000 € pro Seite). Hybrid spart immer noch 50–60 % davon."
            },
            {
              q: "Was kostet die Empfehlung?",
              a: "Die Empfehlung selbst ist kostenlos und braucht keine Anmeldung. Erst wenn du den nächsten Schritt gehen willst (Vollanalyse, Profi-Fotos, Makler-Vermittlung), gibt es buchbare Bausteine."
            },
            {
              q: 'Wie verhindert ihr, dass ihr immer „Makler" empfehlt?',
              a: 'Die Heuristik ist deterministisch und im Code öffentlich nachvollziehbar — keine versteckten Gewichte. Bei einer gepflegten ETW in guter Lage mit erfahrenem Eigentümer kommt fast immer „Selbst" raus. Genau so soll es sein.'
            }
          ]}
        />
      </div>

      {/* FOOTER CTA */}
      <div className="py-20">
        <FooterCta
          title="Bereit, ehrliche Antworten zu bekommen?"
          subtitle="Kostenlos, ohne Anmeldung. Nach der Empfehlung entscheidest du — wir verkaufen dir nichts, was du nicht brauchst."
          primaryHref="#advisor-form"
          primaryLabel="Empfehlung starten"
          secondaryHref="/"
          secondaryLabel="Zurück zur Startseite"
        />
      </div>

      <MarketingFooter />
    </div>
  );
}

function PathCard({
  tone,
  dot,
  title,
  subtitle,
  bullets,
  ctaLabel,
  ctaHref
}: {
  tone: "emerald" | "amber" | "rose";
  dot: string;
  title: string;
  subtitle: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
}) {
  const tones = {
    emerald: { ring: "ring-emerald-100", cta: "bg-emerald-600 hover:bg-emerald-700" },
    amber: { ring: "ring-amber-100", cta: "bg-amber-600 hover:bg-amber-700" },
    rose: { ring: "ring-rose-100", cta: "bg-rose-600 hover:bg-rose-700" }
  } as const;
  const t = tones[tone];
  return (
    <div className={`flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm ring-4 ${t.ring}`}>
      <div className="flex items-center gap-2 text-2xl">{dot}</div>
      <div className="mt-2 text-lg font-semibold text-zinc-900">{title}</div>
      <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>
      <ul className="mt-4 space-y-2 text-sm text-zinc-700">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <svg className="mt-0.5 shrink-0 text-emerald-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5">
        <Link
          href={ctaHref}
          className={`inline-flex items-center gap-1 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm ${t.cta}`}
        >
          {ctaLabel} <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}

function Promise({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <svg
        className="mt-0.5 shrink-0 text-white/80"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>{children}</span>
    </li>
  );
}
