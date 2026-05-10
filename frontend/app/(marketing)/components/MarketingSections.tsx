import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Phase L10 — wiederverwendbare Sektionen für die Landing-Pages.
 * Sowohl Investor-LP als auch Mieter-LP setzen sich aus diesen
 * Bausteinen zusammen.
 */

export function TrustStrip({ stats }: { stats: { big: string; small: string }[] }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-3 rounded-2xl border border-zinc-200 bg-white/60 p-6 shadow-sm backdrop-blur sm:grid-cols-3">
      {stats.map((s) => (
        <div key={s.small} className="text-center">
          <div className="text-2xl font-bold text-zinc-900">{s.big}</div>
          <div className="mt-1 text-xs text-zinc-600">{s.small}</div>
        </div>
      ))}
    </div>
  );
}

export type Pillar = {
  eyebrow: string;
  title: string;
  desc: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
  tone: "indigo" | "amber" | "cyan";
};

const PILLAR_TONES: Record<Pillar["tone"], { ring: string; eyebrow: string; cta: string }> = {
  indigo: {
    ring: "ring-indigo-100",
    eyebrow: "text-indigo-600",
    cta: "bg-indigo-600 hover:bg-indigo-700"
  },
  amber: {
    ring: "ring-amber-100",
    eyebrow: "text-amber-600",
    cta: "bg-amber-600 hover:bg-amber-700"
  },
  cyan: {
    ring: "ring-cyan-100",
    eyebrow: "text-cyan-700",
    cta: "bg-cyan-600 hover:bg-cyan-700"
  }
};

export function PillarsBlock({
  title,
  pillars
}: {
  title: string;
  pillars: Pillar[];
}) {
  return (
    <section className="mx-auto max-w-6xl space-y-8 px-4">
      <h2 className="text-center text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
        {title}
      </h2>
      <div className="grid gap-5 md:grid-cols-3">
        {pillars.map((p) => {
          const t = PILLAR_TONES[p.tone];
          return (
            <div
              key={p.title}
              className={`flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm ring-4 ${t.ring}`}
            >
              <div
                className={`text-xs font-semibold uppercase tracking-[0.18em] ${t.eyebrow}`}
              >
                {p.eyebrow}
              </div>
              <div className="mt-2 text-lg font-semibold text-zinc-900">{p.title}</div>
              <p className="mt-1 text-sm text-zinc-600">{p.desc}</p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <Link
                  href={p.ctaHref}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm ${t.cta}`}
                >
                  {p.ctaLabel} <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function StepsBlock({
  title,
  steps
}: {
  title: string;
  steps: { num: number; title: string; desc: string }[];
}) {
  return (
    <section className="mx-auto max-w-5xl space-y-8 px-4">
      <h2 className="text-center text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
        {title}
      </h2>
      <div className="grid gap-5 md:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.num}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <div className="text-5xl font-bold text-indigo-100">{s.num}</div>
            <div className="mt-1 text-base font-semibold text-zinc-900">{s.title}</div>
            <p className="mt-1 text-sm text-zinc-600">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PricingTeaser() {
  return (
    <section className="mx-auto max-w-4xl px-4">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white shadow-xl sm:p-10">
        <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
              Mitgliedschaft
            </div>
            <h3 className="mt-2 text-2xl font-semibold">
              Werde Mitglied im Investor Club.
            </h3>
            <p className="mt-2 text-sm text-indigo-100">
              Off-Market-Vorsprung, KI-Bietlimit, Verifiziert-Badge — 19 €/Monat.
              Verkäufer und Vermieter inserieren bei uns kostenlos.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
              >
                Jetzt Mitglied werden
              </Link>
              <Link
                href="/pricing"
                className="rounded-xl border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Tarife im Detail
              </Link>
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 p-5 text-sm text-indigo-50 backdrop-blur">
            <Stat label="Monatlich" big="19 €" small="kündbar zum Periodenende" />
            <div className="my-3 h-px bg-white/20" />
            <Stat label="Jährlich" big="190 €" small="2 Monate gratis" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, big, small }: { label: string; big: string; small: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-indigo-200">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-2xl font-bold">{big}</span>
        <span className="text-xs text-indigo-200">{small}</span>
      </div>
    </div>
  );
}

export function MiniFaq({
  title,
  items
}: {
  title: string;
  items: { q: string; a: ReactNode }[];
}) {
  return (
    <section className="mx-auto max-w-3xl space-y-6 px-4">
      <h2 className="text-center text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
        {title}
      </h2>
      <dl className="space-y-3">
        {items.map((it) => (
          <details
            key={it.q}
            className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm open:bg-zinc-50"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold text-zinc-900 marker:hidden [&::-webkit-details-marker]:hidden">
              <span>{it.q}</span>
              <span className="text-zinc-400 group-open:rotate-45 transition">+</span>
            </summary>
            <dd className="mt-3 text-sm text-zinc-600">{it.a}</dd>
          </details>
        ))}
      </dl>
    </section>
  );
}

export function FooterCta({
  title,
  subtitle,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel
}: {
  title: string;
  subtitle: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="mx-auto max-w-3xl px-4 text-center">
      <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-600">{subtitle}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={primaryHref}
          className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link
            href={secondaryHref}
            className="rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white/60 py-8 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 text-xs text-zinc-500">
        <div>© {new Date().getFullYear()} Infinity Oikos · Alle Rechte vorbehalten.</div>
        <div className="flex gap-4">
          <Link href="/sign-in" className="hover:text-indigo-700">
            Anmelden
          </Link>
          <Link href="/pricing" className="hover:text-indigo-700">
            Tarife
          </Link>
          <Link href="/verkaufen" className="hover:text-indigo-700">
            Verkaufen?
          </Link>
          <Link href="/mieten" className="hover:text-indigo-700">
            Für Mieter
          </Link>
          <a href="mailto:hello@infinityoikos.com" className="hover:text-indigo-700">
            Kontakt
          </a>
        </div>
      </div>
    </footer>
  );
}

export function MarketingNav() {
  return (
    <nav className="sticky top-0 z-30 border-b border-zinc-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900">
          Infinity <span className="text-indigo-600">Oikos</span>
        </Link>
        <div className="flex items-center gap-2 text-xs">
          <Link
            href="/verkaufen"
            className="hidden rounded-lg px-3 py-1.5 text-zinc-600 hover:text-indigo-700 sm:inline"
          >
            Verkaufen?
          </Link>
          <Link
            href="/mieten"
            className="hidden rounded-lg px-3 py-1.5 text-zinc-600 hover:text-indigo-700 sm:inline"
          >
            Für Mieter
          </Link>
          <Link
            href="/pricing"
            className="hidden rounded-lg px-3 py-1.5 text-zinc-600 hover:text-indigo-700 sm:inline"
          >
            Tarife
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg px-3 py-1.5 text-zinc-600 hover:text-indigo-700"
          >
            Anmelden
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700"
          >
            Kostenlos starten
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Check() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0 text-emerald-600"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
