"use client";

import { useState } from "react";
import {
  DEFAULT_ASSUMPTIONS,
  fullAnalysis,
  dscr,
  type Assumptions
} from "@/app/property/[id]/finanzierungsmappe/compute";

// Live-Finanzierungsrechner fürs Exposé (Phase 3).
// Interaktiv am Bildschirm: Eigenkapital / Zins / Tilgung anpassen und
// Rate, Cashflow, DSCR, LTV live sehen. Beim Druck werden die Eingabe-
// Regler ausgeblendet (.no-print) — die aktuell gewählten Werte
// "frieren" zu einem sauberen Szenario-Blatt ein.

function eur(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(Math.round(n));
}
function pct(n: number): string {
  return `${n.toFixed(1).replace(".", ",")} %`;
}
function dec(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2).replace(".", ",") : "—";
}

function Kpi({
  label,
  value,
  sub,
  color
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 break-inside-avoid">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="mt-1 text-lg font-bold" style={{ color: color ?? "#0e1525" }}>
        {value}
      </div>
      {sub ? <div className="text-[11px] text-zinc-500">{sub}</div> : null}
    </div>
  );
}

export function FinanceCalculator({ price, rent }: { price: number; rent: number | null }) {
  const closingRate = DEFAULT_ASSUMPTIONS.closingCostsRate;
  const totalInvestment = price * (1 + closingRate);

  const [equity, setEquity] = useState<number>(Math.round(totalInvestment * 0.2));
  const [interest, setInterest] = useState<number>(DEFAULT_ASSUMPTIONS.loanInterestRate * 100); // %
  const [repay, setRepay] = useState<number>(DEFAULT_ASSUMPTIONS.loanRepaymentRate * 100); // %

  const clampedEquity = Math.max(0, Math.min(totalInvestment, equity));
  const equityRatio = totalInvestment > 0 ? clampedEquity / totalInvestment : 0.2;

  const a: Assumptions = {
    ...DEFAULT_ASSUMPTIONS,
    equityRatio,
    loanInterestRate: interest / 100,
    loanRepaymentRate: repay / 100
  };

  const rentVal = rent ?? 0;
  const fa = fullAnalysis(price, rentVal, a);
  const rate = fa.monthlyInterest + fa.monthlyRepayment;
  const hasDebt = fa.loan > 0.5;
  const hasRent = rentVal > 0;
  const dscrVal = hasDebt ? dscr(fa.noiMonthly, rate) : Infinity;
  const ltv = price > 0 ? (fa.loan / price) * 100 : 0;

  const dscrColor = !hasDebt ? "#0e1525" : dscrVal >= 1.25 ? "#059669" : dscrVal >= 1.0 ? "#f59e0b" : "#e11d48";
  const cfColor = fa.cashflow >= 0 ? "#059669" : "#e11d48";

  // Balken EK vs. Darlehen
  const ekPct = totalInvestment > 0 ? (clampedEquity / totalInvestment) * 100 : 0;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
      {/* Eingaben — nur am Bildschirm */}
      <div className="no-print grid gap-4 sm:grid-cols-3">
        <div>
          <div className="flex items-baseline justify-between">
            <label className="text-xs font-semibold text-zinc-600">Eigenkapital</label>
            <span className="text-xs font-bold text-teal-700">{eur(clampedEquity)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.round(totalInvestment)}
            step={1000}
            value={clampedEquity}
            onChange={(e) => setEquity(Number(e.target.value))}
            className="mt-2 w-full accent-teal-600"
          />
          <div className="mt-1 text-[11px] text-zinc-400">{pct(equityRatio * 100)} des Gesamtinvests</div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label className="text-xs font-semibold text-zinc-600">Sollzins</label>
            <span className="text-xs font-bold text-teal-700">{pct(interest)}</span>
          </div>
          <input
            type="range"
            min={1}
            max={7}
            step={0.1}
            value={interest}
            onChange={(e) => setInterest(Number(e.target.value))}
            className="mt-2 w-full accent-teal-600"
          />
          <div className="mt-1 text-[11px] text-zinc-400">p. a.</div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label className="text-xs font-semibold text-zinc-600">Anfangstilgung</label>
            <span className="text-xs font-bold text-teal-700">{pct(repay)}</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={0.5}
            value={repay}
            onChange={(e) => setRepay(Number(e.target.value))}
            className="mt-2 w-full accent-teal-600"
          />
          <div className="mt-1 text-[11px] text-zinc-400">p. a.</div>
        </div>
      </div>

      {/* Annahmen-Zeile — nur im Druck (statt der Regler) */}
      <div className="hidden text-[11px] text-zinc-500 print:block">
        Szenario: Eigenkapital {eur(clampedEquity)} ({pct(equityRatio * 100)}) · Sollzins {pct(interest)} ·
        Anfangstilgung {pct(repay)} · Gesamtinvest inkl. Nebenkosten {eur(totalInvestment)}
      </div>

      {/* EK/Darlehen-Balken */}
      <div className="mt-4">
        <div className="flex h-3 overflow-hidden rounded-full bg-zinc-200">
          <div className="h-full bg-teal-600" style={{ width: `${ekPct}%` }} />
          <div className="h-full bg-zinc-400" style={{ width: `${100 - ekPct}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-zinc-500">
          <span>Eigenkapital {eur(clampedEquity)}</span>
          <span>Darlehen {eur(fa.loan)}</span>
        </div>
      </div>

      {/* Ergebnis-KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi label="Monatliche Rate" value={eur(rate)} sub="Zins + Tilgung" />
        <Kpi label="Darlehen" value={eur(fa.loan)} sub={`LTV ${pct(ltv)}`} />
        {hasRent ? (
          <Kpi label="Cashflow / Monat" value={eur(fa.cashflow)} sub="vor Steuer" color={cfColor} />
        ) : (
          <Kpi label="Gesamtinvest" value={eur(totalInvestment)} sub="inkl. Nebenkosten" />
        )}
        {hasRent ? (
          <Kpi label="DSCR" value={hasDebt ? dec(dscrVal) : "—"} sub="Kapitaldienstdeckung" color={dscrColor} />
        ) : null}
        {hasRent ? <Kpi label="Bruttorendite" value={pct(fa.grossYield)} /> : null}
        {hasRent ? <Kpi label="Nettorendite" value={pct(fa.netYield)} /> : null}
      </div>

      <p className="mt-3 text-[11px] text-zinc-400">
        Unverbindliche Modellrechnung auf Basis der Objektdaten und der gewählten Annahmen — keine
        Finanzierungsberatung oder -zusage. Nebenkosten pauschal {pct(closingRate * 100)}.
      </p>
    </div>
  );
}
