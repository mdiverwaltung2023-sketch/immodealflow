"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import { AnalysisSchema, DEFAULT_ASSUMPTIONS, type Analysis } from "@/lib/api";
import { useApiFetch } from "@/lib/client-fetch";

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

function pct(n: number) {
  return `${n.toFixed(2)} %`;
}

function pctFromRatio(n: number) {
  return `${(n * 100).toFixed(2)} %`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

type FormState = {
  scenarioName: string;
  equityRatioPct: string;
  loanInterestRatePct: string;
  loanRepaymentRatePct: string;
  taxRateIncomePct: string;
  closingCostsRatePct: string;
  maintenanceRatePct: string;
  vacancyRatePct: string;
  buildingSharePct: string;
  afaRatePct: string;
};

const DEFAULT_FORM: FormState = {
  scenarioName: "Standard",
  equityRatioPct: String(DEFAULT_ASSUMPTIONS.equityRatio * 100),
  loanInterestRatePct: String(DEFAULT_ASSUMPTIONS.loanInterestRate * 100),
  loanRepaymentRatePct: String(DEFAULT_ASSUMPTIONS.loanRepaymentRate * 100),
  taxRateIncomePct: String(DEFAULT_ASSUMPTIONS.taxRateIncome * 100),
  closingCostsRatePct: String(DEFAULT_ASSUMPTIONS.closingCostsRate * 100),
  maintenanceRatePct: String(DEFAULT_ASSUMPTIONS.maintenanceRate * 100),
  vacancyRatePct: String(DEFAULT_ASSUMPTIONS.vacancyRate * 100),
  buildingSharePct: String(DEFAULT_ASSUMPTIONS.buildingShare * 100),
  afaRatePct: String(DEFAULT_ASSUMPTIONS.afaRate * 100)
};

function toRatio(s: string): number {
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n)) return NaN;
  return n / 100;
}

export function AnalysesPanel({
  id,
  initialAnalyses
}: {
  id: string;
  initialAnalyses: Analysis[];
}) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [analyses, setAnalyses] = useState<Analysis[]>(initialAnalyses);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function runAnalysis(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);

    const body = {
      scenarioName: form.scenarioName.trim() || "Standard",
      equityRatio: toRatio(form.equityRatioPct),
      loanInterestRate: toRatio(form.loanInterestRatePct),
      loanRepaymentRate: toRatio(form.loanRepaymentRatePct),
      taxRateIncome: toRatio(form.taxRateIncomePct),
      closingCostsRate: toRatio(form.closingCostsRatePct),
      maintenanceRate: toRatio(form.maintenanceRatePct),
      vacancyRate: toRatio(form.vacancyRatePct),
      buildingShare: toRatio(form.buildingSharePct),
      afaRate: toRatio(form.afaRatePct)
    };

    if (Object.values(body).some((v) => typeof v === "number" && Number.isNaN(v))) {
      setError("Bitte alle Felder als Zahl in Prozent angeben.");
      return;
    }

    setBusy(true);
    try {
      const res = await apiFetch(`/analyze/${id}`, {
        method: "POST",
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Fehlgeschlagen (${res.status}) ${txt}`);
      }
      const created = AnalysisSchema.parse(await res.json());
      setAnalyses((prev) => [created, ...prev]);
      setShowForm(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function quickAnalysis() {
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch(`/analyze/${id}`, {
        method: "POST",
        body: JSON.stringify({ scenarioName: "Standard" })
      });
      if (!res.ok) throw new Error(`Fehlgeschlagen (${res.status})`);
      const created = AnalysisSchema.parse(await res.json());
      setAnalyses((prev) => [created, ...prev]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAnalysis(analysisId: string) {
    if (!confirm("Diese Analyse wirklich löschen?")) return;
    setError(null);
    try {
      const res = await apiFetch(`/analyses/${analysisId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`DELETE fehlgeschlagen (${res.status})`);
      setAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={quickAnalysis} disabled={busy}>
          {busy ? "Berechne…" : "Schnell-Analyse (Standard-Annahmen)"}
        </Button>
        <Button variant="secondary" onClick={() => setShowForm((s) => !s)} disabled={busy}>
          {showForm ? "Form schließen" : "Eigenes Szenario…"}
        </Button>
        {error ? <span className="text-sm text-rose-400">{error}</span> : null}
      </div>

      {showForm ? (
        <form onSubmit={runAnalysis} className="space-y-3 rounded-xl border bg-zinc-950 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-3">
              <Label>Szenario-Name</Label>
              <Input
                value={form.scenarioName}
                onChange={(e) => update("scenarioName", e.target.value)}
                placeholder="z.B. Best Case, Stress Test"
              />
            </div>

            <div>
              <Label>Eigenkapital (% vom Gesamtinvest)</Label>
              <Input
                inputMode="decimal"
                value={form.equityRatioPct}
                onChange={(e) => update("equityRatioPct", e.target.value)}
              />
            </div>
            <div>
              <Label>Zins p.a. (%)</Label>
              <Input
                inputMode="decimal"
                value={form.loanInterestRatePct}
                onChange={(e) => update("loanInterestRatePct", e.target.value)}
              />
            </div>
            <div>
              <Label>Tilgung p.a. (%)</Label>
              <Input
                inputMode="decimal"
                value={form.loanRepaymentRatePct}
                onChange={(e) => update("loanRepaymentRatePct", e.target.value)}
              />
            </div>

            <div>
              <Label>Kaufnebenkosten (% v. Kaufpreis)</Label>
              <Input
                inputMode="decimal"
                value={form.closingCostsRatePct}
                onChange={(e) => update("closingCostsRatePct", e.target.value)}
              />
            </div>
            <div>
              <Label>Steuersatz (Einkommen, %)</Label>
              <Input
                inputMode="decimal"
                value={form.taxRateIncomePct}
                onChange={(e) => update("taxRateIncomePct", e.target.value)}
              />
            </div>
            <div>
              <Label>Instandhaltung (% der Miete)</Label>
              <Input
                inputMode="decimal"
                value={form.maintenanceRatePct}
                onChange={(e) => update("maintenanceRatePct", e.target.value)}
              />
            </div>

            <div>
              <Label>Leerstand (% der Miete)</Label>
              <Input
                inputMode="decimal"
                value={form.vacancyRatePct}
                onChange={(e) => update("vacancyRatePct", e.target.value)}
              />
            </div>
            <div>
              <Label>Gebäudeanteil (% v. Kaufpreis, AfA-Basis)</Label>
              <Input
                inputMode="decimal"
                value={form.buildingSharePct}
                onChange={(e) => update("buildingSharePct", e.target.value)}
              />
            </div>
            <div>
              <Label>AfA-Satz p.a. (%)</Label>
              <Input
                inputMode="decimal"
                value={form.afaRatePct}
                onChange={(e) => update("afaRatePct", e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Berechne…" : "Szenario rechnen"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setForm(DEFAULT_FORM)}
              disabled={busy}
            >
              Defaults zurücksetzen
            </Button>
          </div>
        </form>
      ) : null}

      {analyses.length === 0 ? (
        <div className="text-sm text-zinc-400">Noch keine Analysen.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-900">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">Datum</th>
                <th className="px-3 py-2 font-medium">Szenario</th>
                <th className="px-3 py-2 font-medium">EK / Zins / Tilg.</th>
                <th className="px-3 py-2 font-medium">Gesamtinvest</th>
                <th className="px-3 py-2 font-medium">Brutto / Netto</th>
                <th className="px-3 py-2 font-medium">CF / CF n. Steuer</th>
                <th className="px-3 py-2 font-medium">Score</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-zinc-200">
              {analyses.map((a) => (
                <tr key={a.id} className="hover:bg-zinc-950/60">
                  <td className="px-3 py-2 whitespace-nowrap text-zinc-400">{formatDate(a.createdAt)}</td>
                  <td className="px-3 py-2 font-medium">{a.scenarioName}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {pctFromRatio(a.equityRatio)} / {pctFromRatio(a.loanInterestRate)} / {pctFromRatio(a.loanRepaymentRate)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {eur(a.totalInvestment)} <span className="text-zinc-500">(NK {eur(a.closingCosts)})</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {pct(a.grossYield)} / <span className="font-semibold">{pct(a.netYield)}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {eur(a.cashflow)} / <span className={a.cashflowAfterTax >= 0 ? "text-emerald-400" : "text-rose-400"}>{eur(a.cashflowAfterTax)}</span>
                  </td>
                  <td className="px-3 py-2 font-semibold">{a.score}/100</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => deleteAnalysis(a.id)}
                      className="text-zinc-500 hover:text-rose-400"
                      title="Analyse löschen"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
