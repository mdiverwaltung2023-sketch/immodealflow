import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { GeometricBackground } from "../(marketing)/components/GeometricBackground";
import { HeroTenantSearch } from "../(marketing)/components/HeroTenantSearch";
import {
  TrustStrip,
  StepsBlock,
  MiniFaq,
  FooterCta,
  MarketingFooter,
  MarketingNav
} from "../(marketing)/components/MarketingSections";

/**
 * Phase L10 — Mieter-Landing-Page (/mieten).
 *
 * Eigener Conversion-Hook: Suchformular im Hero. Eingaben werden
 * in /sign-up?redirect_url=/rental-marketplace?city=… übergeben,
 * sodass der Mieter nach dem Sign-up direkt seine Treffer sieht.
 *
 * Hauptdifferenzierung gegenüber Konkurrenz: AGG-Konformität.
 * Vermieter sehen die organisatorisch/wirtschaftlichen Eckdaten,
 * keine sensiblen Merkmale (Familienstand, Herkunft, Geschlecht etc.).
 */
export default async function TenantLandingPage() {
  const a = await auth();
  if (a.userId) {
    redirect("/rental-marketplace");
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <MarketingNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <GeometricBackground />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Faire Wohnungssuche
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Bewirb dich. Nicht erklären, wer du bist.
            </h1>
            <p className="mt-4 max-w-xl text-base text-zinc-600">
              Vermieter sehen deine wirtschaftlichen Eckdaten — Beruf, Bonität,
              Haushaltsgröße. Kein Familienstand, keine Herkunft, keine Religion.
              Bewerben in einem Klick statt zehn Mal das gleiche Formular.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700"
              >
                Kostenlos registrieren
              </Link>
              <Link
                href="/sign-in"
                className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-white/80"
              >
                Anmelden
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
              <span>✓ Kostenlos für Mieter</span>
              <span>✓ AGG-konform</span>
              <span>✓ 1-Klick-Bewerbung mit Mieter-Profil</span>
            </div>
          </div>

          <div className="flex items-center">
            <HeroTenantSearch />
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="mx-auto max-w-6xl px-4 -mt-8">
        <TrustStrip
          stats={[
            { big: "AGG-konform", small: "keine sensiblen Merkmale erforderlich" },
            { big: "1 Profil", small: "alle Bewerbungen — kein Mehrfach-Tippen" },
            { big: "Anonyme Adressen", small: "Vermieter teilt sie nach Freigabe" }
          ]}
        />
      </section>

      {/* WAS BRINGT DIR DAS — Vergleich */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Wohnungssuche, wie sie sein sollte.
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">
              Klassische Portale
            </div>
            <ul className="mt-3 space-y-2 text-sm text-zinc-700">
              <Bad>10× das gleiche Formular ausfüllen</Bad>
              <Bad>Nach Familienstand, Religion, Herkunft gefragt werden</Bad>
              <Bad>Auf eine Antwort warten, die nie kommt</Bad>
              <Bad>Adresse erst nach Massen-Mail klar</Bad>
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-cyan-300 bg-white p-6 shadow-md ring-4 ring-cyan-100">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Infinity Oikos
            </div>
            <ul className="mt-3 space-y-2 text-sm text-zinc-700">
              <Good>Mieter-Profil einmal pflegen — überall in einem Klick bewerben</Good>
              <Good>Nur Eckdaten, die der Vermieter wirklich braucht</Good>
              <Good>Status pro Bewerbung sichtbar — keine Blackbox</Good>
              <Good>Adresse anonym, bis du persönlich freigegeben wirst</Good>
            </ul>
          </div>
        </div>
      </section>

      {/* STEPS */}
      <div className="bg-white py-20">
        <StepsBlock
          title="In drei Schritten zur Wohnung."
          steps={[
            {
              num: 1,
              title: "Profil anlegen",
              desc: "Kostenlos. Beruf, Einkommen, Wunschkriterien — du entscheidest, was du teilst."
            },
            {
              num: 2,
              title: "Mietbörse durchsuchen",
              desc: "Filter nach Stadt, Miete, Zimmer, Möbliert, Haustiere, Barrierefrei."
            },
            {
              num: 3,
              title: "1-Klick-Bewerbung",
              desc: "Dein Profil wird übermittelt — kein Tippen, kein Hinterherlaufen."
            }
          ]}
        />
      </div>

      {/* MIETER-PROFIL TEASER */}
      <section className="mx-auto max-w-4xl px-4 py-20">
        <div className="rounded-3xl bg-gradient-to-br from-cyan-600 to-teal-700 p-8 text-white shadow-xl sm:p-10">
          <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                Mieter-Profil
              </div>
              <h3 className="mt-2 text-2xl font-semibold">
                Pflege es einmal. Bewirb dich überall in einem Klick.
              </h3>
              <p className="mt-2 text-sm text-cyan-100">
                Beruf, Einkommen, Haushaltsgröße, Wunschkriterien — alles an
                einem Ort. Vermieter sehen sofort, wer du wirtschaftlich bist.
                AGG-konform: keine sensiblen Merkmale.
              </p>
              <Link
                href="/sign-up"
                className="mt-5 inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-cyan-700 shadow-sm hover:bg-cyan-50"
              >
                Profil kostenlos anlegen
              </Link>
            </div>
            <div className="rounded-2xl bg-white/10 p-5 text-sm text-cyan-50 backdrop-blur">
              <ProfilePreview label="Beruf" value="Festanstellung · 4 Jahre" />
              <ProfilePreview label="Haushalt" value="2 Personen, Nichtraucher" />
              <ProfilePreview label="Bonität" value="SCHUFA-Score 95, Selbstauskunft vorhanden" />
              <ProfilePreview label="Wunsch" value="Berlin · max. 1.400 € · 2,5 Zi" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <div className="bg-white py-20">
        <MiniFaq
          title="Häufige Fragen."
          items={[
            {
              q: 'Was bedeutet „AGG-konform" konkret?',
              a: "Wir erheben keine Angaben zu Familienstand, Herkunft, Religion, Geschlecht, Alter oder Behinderung. Vermieter sehen nur wirtschaftliche und organisatorische Daten — exakt das, was sie tatsächlich für die Vermietungs-Entscheidung brauchen."
            },
            {
              q: "Wann sieht der Vermieter meine Adresse / meinen Namen?",
              a: "Erst, wenn er deine Bewerbung freigibt. Bis dahin bist du anonym in deinem Profil sichtbar. Du behältst die Kontrolle."
            },
            {
              q: "Kostet das wirklich nichts?",
              a: "Nichts. Mieter inserieren nicht — und für Mieter ist Infinity Oikos vollständig kostenlos. Wir monetarisieren ausschließlich die Investorenseite."
            },
            {
              q: "Was, wenn ich noch keine Wunschwohnung kenne?",
              a: "Pflege dein Profil und stöbere durch die Mietbörse. Du kannst dich auch auf mehrere Wohnungen gleichzeitig bewerben — dein Profil reicht in 1-Klick durch."
            }
          ]}
        />
      </div>

      {/* FOOTER CTA */}
      <div className="py-20">
        <FooterCta
          title="Bereit, fair gefunden zu werden?"
          subtitle="Profil anlegen, Mietbörse durchsuchen, in einem Klick bewerben."
          primaryHref="/sign-up"
          primaryLabel="Kostenlos starten"
          secondaryHref="/sign-in"
          secondaryLabel="Anmelden"
        />
      </div>

      <MarketingFooter />
    </div>
  );
}

function Good({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <svg
        className="mt-0.5 shrink-0 text-emerald-600"
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

function Bad({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-zinc-500 line-through">
      <svg
        className="mt-0.5 shrink-0 text-rose-400"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
      <span>{children}</span>
    </li>
  );
}

function ProfilePreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-white/10 py-2 last:border-0">
      <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}
