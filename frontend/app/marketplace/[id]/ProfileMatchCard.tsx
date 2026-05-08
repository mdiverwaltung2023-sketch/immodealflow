import { InvestorProfileSchema, type MarketplaceListingDetailT } from "@/lib/api";
import { apiGet } from "@/lib/api-server";

type Check = {
  ok: boolean | "warn";
  label: string;
  detail: string;
};

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

/**
 * Server-Component: Holt das eigene Investor-Profil und vergleicht es
 * mit dem Listing. Zeigt vier Match-Indikatoren:
 *   - Asset-Typ-Präferenz
 *   - Region-Präferenz
 *   - Ticket-Size (Min/Max)
 *   - Bonität (max Investitionssumme aus Faustformel vs. Gesamtinvest)
 *
 * Jeder Check ist grün/gelb/grau. Kein "fail" um nicht zu negativ zu wirken.
 */
export async function ProfileMatchCard({ listing }: { listing: MarketplaceListingDetailT }) {
  const profile = await apiGet("/me/profile", InvestorProfileSchema).catch(() => null);
  if (!profile) return null;

  const checks: Check[] = [];

  // 1) Asset-Typ
  if (profile.preferredAssetTypes && profile.preferredAssetTypes.length > 0) {
    const inPref = profile.preferredAssetTypes.includes(listing.propertyType);
    checks.push({
      ok: inPref,
      label: "Asset-Klasse",
      detail: inPref
        ? "Passt zu deinen Präferenzen."
        : "Steht nicht in deiner Wunschliste — trotzdem prüfenswert?"
    });
  }

  // 2) Region — match wenn Stadt oder PLZ-Prefix in preferredRegions auftaucht
  if (profile.preferredRegions && profile.preferredRegions.length > 0) {
    const haystack = [listing.city, listing.district, listing.postalCode]
      .filter(Boolean)
      .map((s) => (s as string).toLowerCase());
    const match = profile.preferredRegions.some((r) =>
      haystack.some((h) => h.includes(r.toLowerCase()) || r.toLowerCase().includes(h))
    );
    checks.push({
      ok: match,
      label: "Region",
      detail: match
        ? `${listing.city} passt zu deinen Wunschregionen.`
        : `${listing.city} ist nicht in deiner Wunschliste.`
    });
  }

  // 3) Ticket-Size
  if (profile.minTicketSize != null || profile.maxTicketSize != null) {
    const min = profile.minTicketSize ?? 0;
    const max = profile.maxTicketSize ?? Number.POSITIVE_INFINITY;
    const inRange = listing.askingPrice >= min && listing.askingPrice <= max;
    const tooSmall = listing.askingPrice < min;
    const tooBig = listing.askingPrice > max;
    let detail: string;
    if (inRange) {
      detail = "Liegt in deiner Wunsch-Ticket-Größe.";
    } else if (tooSmall) {
      detail = `${eur(listing.askingPrice)} unter deinem Min ${eur(min)}.`;
    } else if (tooBig) {
      detail = `${eur(listing.askingPrice)} über deinem Max ${eur(max)}.`;
    } else {
      detail = "—";
    }
    checks.push({
      ok: inRange ? true : "warn",
      label: "Ticket-Size",
      detail
    });
  }

  // 4) Bonität — Max-Investitionssumme aus Faustformel (40 % Income - Debt) / 5,8 % Annuität
  if (profile.monthlyIncome != null) {
    const cap = profile.monthlyIncome * 0.4;
    const debtService = Math.max(0, cap - (profile.monthlyDebt ?? 0));
    const factor = 0.058 / 12;
    const maxLoan = Math.round(debtService / factor);
    const maxInvestment = maxLoan + (profile.equity ?? 0);

    // Listing benötigt: askingPrice + ca. 12% Nebenkosten
    const requiredTotal = Math.round(listing.askingPrice * 1.12);
    const ok = maxInvestment >= requiredTotal;
    const tightOk =
      !ok && maxInvestment >= listing.askingPrice; // EK reicht aber nicht für NK
    checks.push({
      ok: ok ? true : tightOk ? "warn" : "warn",
      label: "Bonität",
      detail: ok
        ? `Max ≈ ${eur(maxInvestment)} reicht für Gesamtinvest ${eur(requiredTotal)}.`
        : tightOk
        ? `Max ≈ ${eur(maxInvestment)} deckt Kaufpreis, aber nicht ${eur(requiredTotal - maxInvestment)} Nebenkosten.`
        : `Max ≈ ${eur(maxInvestment)} reicht nicht für Gesamtinvest ${eur(requiredTotal)}.`
    });
  }

  if (checks.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Profil-Match
        </div>
        <p className="mt-2 text-sm text-zinc-600">
          Pflege dein Investor-Profil unter{" "}
          <a href="/profile" className="font-medium text-indigo-600 hover:text-indigo-700 underline">
            /profile
          </a>
          , damit wir dir zeigen können, ob dieses Inserat zu deinem Suchprofil passt.
        </p>
      </div>
    );
  }

  const greens = checks.filter((c) => c.ok === true).length;
  const total = checks.length;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Profil-Match
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            greens === total
              ? "bg-emerald-100 text-emerald-800"
              : greens >= total / 2
              ? "bg-amber-100 text-amber-800"
              : "bg-zinc-100 text-zinc-700"
          }`}
        >
          {greens} / {total}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {checks.map((c) => (
          <li key={c.label} className="flex items-start gap-2.5 text-sm">
            <Indicator state={c.ok} />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-zinc-800">{c.label}</div>
              <div className="text-xs text-zinc-500">{c.detail}</div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-md bg-indigo-50 p-2 text-[11px] text-indigo-800">
        Der Anbieter sieht dein Profil bei Anfrage — qualifizierte Anfragen kommen sofort durch.
      </div>
    </div>
  );
}

function Indicator({ state }: { state: boolean | "warn" }) {
  if (state === true) {
    return (
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    );
  }
  if (state === "warn") {
    return (
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </span>
  );
}
