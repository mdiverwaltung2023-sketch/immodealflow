import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { GeometricBackground } from "./(marketing)/components/GeometricBackground";
import { HeroCalculator } from "./(marketing)/components/HeroCalculator";
import {
  TrustStrip,
  PillarsBlock,
  StepsBlock,
  PricingTeaser,
  MiniFaq,
  FooterCta,
  MarketingFooter,
  MarketingNav,
  type Pillar
} from "./(marketing)/components/MarketingSections";

/**
 * Phase L10 — Investor-/Verkäufer-Landing-Page.
 *
 * Conversion-Hook: lokal gerechneter Bietlimit-Rechner direkt im
 * Hero. Wer Eckdaten eingibt, ist ein qualifizierter Lead.
 *
 * Eingeloggte User werden zum Dashboard umgeleitet — die LP zeigt
 * sich nur Anonymen.
 */
export default async function Home() {
  const a = await auth();
  if (a.userId) {
    redirect("/dashboard");
  }

  const pillars: Pillar[] = [
    {
      eyebrow: "Investoren",
      title: "Bessere Deals, früher.",
      desc: "Off-Market-Vorsprung und KI-Bietlimit pro Objekt.",
      bullets: [
        "Off-Market-Deals 4–7 Tage vor allen anderen",
        "KI-gestützte Bietlimits — datenbasiert, nachvollziehbar",
        "Verifiziert-Badge: Anfragen werden häufiger angenommen"
      ],
      ctaLabel: "Investor Club",
      ctaHref: "/pricing",
      tone: "indigo"
    },
    {
      eyebrow: "Verkäufer & Vermieter",
      title: "Inserieren ist kostenlos.",
      desc: "Du erreichst Investoren mit verifiziertem Profil.",
      bullets: [
        "Unbegrenzt Inserate, kein Abo, keine Listing-Limits",
        "Anfragen mit Bonität & Trackrecord auf einen Blick",
        "Anonymisierung: Adresse erst nach deiner Freigabe"
      ],
      ctaLabel: "Inserat anlegen",
      ctaHref: "/sign-up",
      tone: "amber"
    },
    {
      eyebrow: "Mieter",
      title: "Faire Wohnungssuche.",
      desc: "AGG-konforme Bewerbung — Vermieter sehen deine Eckdaten, nicht dein Familienstand.",
      bullets: [
        "Mietbörse mit anonymisierten Adressen",
        "1-Klick-Bewerbung mit deinem Profil",
        "Keine sensiblen Merkmale erforderlich"
      ],
      ctaLabel: "Für Mieter",
      ctaHref: "/mieten",
      tone: "cyan"
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <MarketingNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <GeometricBackground />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              KI-gestützte Investmentplattform
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Was zahlt der Markt für deine Immobilie?
            </h1>
            <p className="mt-4 max-w-xl text-base text-zinc-600">
              Datengetriebene Schätzung in 30 Sekunden — kostenlos und ohne Anmeldung.
              Mehrfamilienhäuser, Eigentumswohnungen, Gewerbe. Off-Market-Vorsprung
              und KI-Bietlimit für Mitglieder im Investor Club.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                Kostenlos starten
              </Link>
              <Link
                href="/pricing"
                className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-white/80"
              >
                Investor Club ansehen
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
              <span>✓ Verkäufer/Vermieter inserieren kostenlos</span>
              <span>✓ Monatlich kündbar</span>
              <span>✓ AGG-konform</span>
            </div>
          </div>

          <div className="flex items-center">
            <HeroCalculator />
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="mx-auto max-w-6xl px-4 -mt-8">
        <TrustStrip
          stats={[
            { big: "1.200+", small: "Off-Market-Objekte analysiert" },
            { big: "Ø 4,2 %", small: "präzisere Bietlimits dank KI-Modell" },
            { big: "AGG-konform", small: "Anti-Diskriminierung by design" }
          ]}
        />
      </section>

      {/* PILLARS */}
      <div className="py-20">
        <PillarsBlock title="Eine Plattform, drei klare Wege." pillars={pillars} />
      </div>

      {/* STEPS */}
      <div className="bg-white py-20">
        <StepsBlock
          title="So funktioniert's."
          steps={[
            {
              num: 1,
              title: "Kostenlos registrieren",
              desc: "In 60 Sekunden — keine Karte nötig, kein Limit."
            },
            {
              num: 2,
              title: "Analyse oder Inserat",
              desc: "Investoren bekommen KI-Analyse + Off-Market. Verkäufer und Vermieter inserieren unbegrenzt."
            },
            {
              num: 3,
              title: "Match → Deal",
              desc: "Verifizierte Profile, anonymisierte Adressen, transparente Anfragen."
            }
          ]}
        />
      </div>

      {/* PRICING TEASER */}
      <div className="py-20">
        <PricingTeaser />
      </div>

      {/* FAQ */}
      <div className="bg-white py-20">
        <MiniFaq
          title="Was du wissen solltest."
          items={[
            {
              q: "Was bringt mir der Off-Market-Zugang konkret?",
              a: "Off-Market-Inserate werden 4–7 Tage vor allen anderen für Investor-Club-Mitglieder freigeschaltet. Du siehst Deals in dem Fenster, in dem die besten Preise gemacht werden."
            },
            {
              q: "Wie zuverlässig ist die KI-Analyse?",
              a: "Die Hero-Schätzung oben ist eine grobe Marktorientierung mit Stadt-, Asset- und Baujahr-Faktoren. Im Investor Club bekommst du die volle KI-Analyse mit Mietspiegel, Lage, Energiestatus und Off-Market-Vergleichen."
            },
            {
              q: "Warum ist es für Verkäufer und Vermieter kostenlos?",
              a: "Wir monetarisieren ausschließlich die Investorenseite. Mehr Inventar macht die Plattform für Käufer wertvoller — alle gewinnen."
            },
            {
              q: "Gibt es eine Mindestlaufzeit?",
              a: "Nein. Investor Club ist monatlich kündbar zum Periodenende. Stripe Customer Portal in zwei Klicks erreichbar."
            }
          ]}
        />
      </div>

      {/* FOOTER CTA */}
      <div className="py-20">
        <FooterCta
          title="Bereit, bessere Deals zu sehen?"
          subtitle="Kostenlos starten, Profil anlegen, Markt erkunden — Investor Club jederzeit dazubuchen."
          primaryHref="/sign-up"
          primaryLabel="Kostenlos registrieren"
          secondaryHref="/sign-in"
          secondaryLabel="Anmelden"
        />
      </div>

      <MarketingFooter />
    </div>
  );
}
