"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Stat } from "@/components/ui";
import { useApiFetch } from "@/lib/client-fetch";
import {
  AssetTypeEnum,
  ASSET_TYPE_LABELS,
  PROFILE_VISIBILITY_LABELS,
  ProfileVisibilityEnum,
  TRACKRECORD_ROLE_LABELS,
  TrackrecordRoleEnum,
  type AssetTypeT,
  type InvestorProfileT,
  type ProfileVisibilityT,
  type TrackrecordItemT,
  type TrackrecordRoleT,
  type UserRoleT
} from "@/lib/api";

const ASSET_TYPES = AssetTypeEnum.options;
const VISIBILITY_OPTIONS = ProfileVisibilityEnum.options;
const TRACKRECORD_ROLES = TrackrecordRoleEnum.options;

const VISIBILITY_DESCRIPTIONS: Record<ProfileVisibilityT, string> = {
  PRIVATE: "Nur du siehst dein Profil. Verkäufer bekommen es auch bei Anfragen nicht.",
  ON_REQUEST: "Verkäufer sehen dein Profil erst, wenn du eine Anfrage zu ihrem Listing stellst.",
  PUBLIC: "Eingeloggte Verkäufer können dein Profil jederzeit sehen — gut für maximale Sichtbarkeit."
};

function eur(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

function intInputToNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function ProfileEditor({
  initial,
  userName,
  userRole
}: {
  initial: InvestorProfileT;
  userName: string | null;
  userRole: UserRoleT;
}) {
  const router = useRouter();
  const apiFetch = useApiFetch();

  // Formular-State
  const [bio, setBio] = useState(initial.bio ?? "");
  const [yearsExp, setYearsExp] = useState<number>(initial.investmentExperienceYears);
  const [equity, setEquity] = useState<string>(initial.equity != null ? String(initial.equity) : "");
  const [income, setIncome] = useState<string>(initial.monthlyIncome != null ? String(initial.monthlyIncome) : "");
  const [debt, setDebt] = useState<string>(initial.monthlyDebt != null ? String(initial.monthlyDebt) : "");
  const [preApproved, setPreApproved] = useState<boolean>(initial.financingPreApproved);
  const [financingNote, setFinancingNote] = useState(initial.financingNote ?? "");
  const [assetTypes, setAssetTypes] = useState<AssetTypeT[]>(initial.preferredAssetTypes);
  const [regionsRaw, setRegionsRaw] = useState<string>(initial.preferredRegions.join(", "));
  const [minTicket, setMinTicket] = useState<string>(initial.minTicketSize != null ? String(initial.minTicketSize) : "");
  const [maxTicket, setMaxTicket] = useState<string>(initial.maxTicketSize != null ? String(initial.maxTicketSize) : "");
  const [visibility, setVisibility] = useState<ProfileVisibilityT>(initial.visibility);

  const [trackrecord, setTrackrecord] = useState<TrackrecordItemT[]>(initial.trackrecord);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Live-Bonitäts-Calc clientside (gleiche Formel wie Backend)
  const live = useMemo(() => {
    const inc = intInputToNum(income);
    const dbt = intInputToNum(debt);
    const ek = intInputToNum(equity);
    if (inc == null) return { maxMonthlyDebtService: null, maxLoan: null, maxInvestment: null };
    const cap = inc * 0.4;
    const dms = Math.max(0, Math.round(cap - (dbt ?? 0)));
    const factor = 0.058 / 12;
    const maxLoan = Math.round(dms / factor);
    const maxInv = maxLoan + (ek ?? 0);
    return { maxMonthlyDebtService: dms, maxLoan, maxInvestment: maxInv };
  }, [income, debt, equity]);

  function toggleAssetType(t: AssetTypeT) {
    setAssetTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    setBusy(true);
    try {
      const body = {
        bio: bio.trim() || null,
        investmentExperienceYears: yearsExp,
        equity: intInputToNum(equity),
        monthlyIncome: intInputToNum(income),
        monthlyDebt: intInputToNum(debt),
        financingPreApproved: preApproved,
        financingNote: financingNote.trim() || null,
        preferredAssetTypes: assetTypes,
        preferredRegions: regionsRaw
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
        minTicketSize: intInputToNum(minTicket),
        maxTicketSize: intInputToNum(maxTicket),
        visibility
      };
      const res = await apiFetch("/me/profile", {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Speichern fehlgeschlagen (${res.status}) ${txt.slice(0, 200)}`);
      }
      setSaved("Gespeichert ✓");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card title={`Identität${userName ? ` — ${userName}` : ""}`}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Rolle (aus Onboarding)</Label>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              {userRole === "INVESTOR" ? "Investor" : userRole === "SELLER" ? "Verkäufer" : "Beides"}
            </div>
          </div>
          <div>
            <Label>Erfahrung (Jahre)</Label>
            <input
              type="number"
              min={0}
              max={80}
              value={yearsExp}
              onChange={(e) => setYearsExp(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Kurzprofil / Bio</Label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Z. B. Investor seit 2018 mit Fokus MFH 5–25 Einheiten in Berlin und Brandenburg. Eigene Hausverwaltung, Cashflow-orientierter Buy-and-Hold."
              rows={4}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </Card>

      <Card title="Bonität (Selbstauskunft)">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Eigenkapital (EUR)</Label>
            <input
              type="text"
              inputMode="numeric"
              value={equity}
              onChange={(e) => setEquity(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="z. B. 250000"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <Label>Netto-Einkommen / Monat (EUR)</Label>
            <input
              type="text"
              inputMode="numeric"
              value={income}
              onChange={(e) => setIncome(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="z. B. 6500"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <Label>Verbindlichkeiten / Monat (EUR)</Label>
            <input
              type="text"
              inputMode="numeric"
              value={debt}
              onChange={(e) => setDebt(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="z. B. 950"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="md:col-span-3">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={preApproved}
                onChange={(e) => setPreApproved(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 bg-white text-indigo-600 focus:ring-indigo-500"
              />
              Finanzierung vorab bestätigt (Bankzusage / Maklerbestätigung liegt vor)
            </label>
          </div>
          <div className="md:col-span-3">
            <Label>Finanzierungs-Notiz (optional)</Label>
            <input
              type="text"
              value={financingNote}
              onChange={(e) => setFinancingNote(e.target.value)}
              placeholder="z. B. Bankzusage Sparkasse Berlin, gültig bis Q4/2026"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-3">
          <Stat
            label="Max. Kapitaldienst / Monat"
            value={live.maxMonthlyDebtService != null ? eur(live.maxMonthlyDebtService) + " /Mon." : "—"}
          />
          <Stat
            label="Max. Darlehen (5,8 % Annuität)"
            value={eur(live.maxLoan)}
          />
          <Stat
            label="Max. Investitionssumme"
            value={eur(live.maxInvestment)}
          />
        </div>
        <div className="mt-2 text-xs text-zinc-500">
          Faustformel: 40 % des Netto-Einkommens minus laufende Verbindlichkeiten als Kapitaldienst,
          umgerechnet bei 3,8 % Zins + 2 % Tilgung. Selbstauskunft, keine Bankprüfung.
        </div>
      </Card>

      <Card title="Präferenzen">
        <div className="space-y-4">
          <div>
            <Label>Bevorzugte Asset-Klassen</Label>
            <div className="flex flex-wrap gap-2">
              {ASSET_TYPES.map((t) => {
                const active = assetTypes.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleAssetType(t)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
                    }`}
                  >
                    {ASSET_TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Bevorzugte Regionen (kommagetrennt)</Label>
            <input
              type="text"
              value={regionsRaw}
              onChange={(e) => setRegionsRaw(e.target.value)}
              placeholder="Berlin, Potsdam, Brandenburg, NRW"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <div className="mt-1 text-xs text-zinc-500">
              Stadt, PLZ-Bereich oder Region. Mehrere mit Komma trennen.
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Min. Ticket-Size (EUR)</Label>
              <input
                type="text"
                inputMode="numeric"
                value={minTicket}
                onChange={(e) => setMinTicket(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="z. B. 500000"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <Label>Max. Ticket-Size (EUR)</Label>
              <input
                type="text"
                inputMode="numeric"
                value={maxTicket}
                onChange={(e) => setMaxTicket(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="z. B. 3000000"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card title="Sichtbarkeit">
        <div className="grid gap-3 md:grid-cols-3">
          {VISIBILITY_OPTIONS.map((v) => {
            const active = visibility === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setVisibility(v)}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <div className="text-sm font-semibold text-zinc-900">
                  {PROFILE_VISIBILITY_LABELS[v]}
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  {VISIBILITY_DESCRIPTIONS[v]}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={saveProfile}
          disabled={busy}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? "Speichern…" : "Profil speichern"}
        </button>
        {saved ? <span className="text-xs text-emerald-700">{saved}</span> : null}
        {error ? <span className="text-xs text-rose-600">{error}</span> : null}
      </div>

      <TrackrecordSection
        items={trackrecord}
        onChange={setTrackrecord}
      />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">{children}</div>;
}

function TrackrecordSection({
  items,
  onChange
}: {
  items: TrackrecordItemT[];
  onChange: (items: TrackrecordItemT[]) => void;
}) {
  const apiFetch = useApiFetch();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form-State für Add
  const currentYear = new Date().getFullYear();
  const [type, setType] = useState<AssetTypeT>("MFH");
  const [year, setYear] = useState<number>(currentYear);
  const [value, setValue] = useState<string>("");
  const [location, setLocation] = useState("");
  const [role, setRole] = useState<TrackrecordRoleT>("BUYER");
  const [description, setDescription] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!location.trim()) {
      setError("Lage angeben.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const body = {
        type,
        year,
        value: intInputToNum(value),
        location: location.trim(),
        role,
        description: description.trim() || null
      };
      const res = await apiFetch("/me/trackrecord", {
        method: "POST",
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Anlegen fehlgeschlagen (${res.status}) ${txt.slice(0, 200)}`);
      }
      const item = (await res.json()) as TrackrecordItemT;
      onChange([item, ...items]);
      // Reset
      setValue("");
      setLocation("");
      setDescription("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Eintrag löschen?")) return;
    const res = await apiFetch(`/me/trackrecord/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Löschen fehlgeschlagen");
      return;
    }
    onChange(items.filter((i) => i.id !== id));
  }

  return (
    <Card title={`Trackrecord (${items.length})`}>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-zinc-500">
            Noch keine Trackrecord-Einträge. Lege Deals an, die du gekauft, verkauft oder vermittelt hast —
            das ist das, was Verkäufer am meisten überzeugt.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {items.map((it) => (
              <div key={it.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zinc-900">
                    {it.year} • {ASSET_TYPE_LABELS[it.type]} • {TRACKRECORD_ROLE_LABELS[it.role]} • {it.location}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {it.value != null ? `Volumen: ${eur(it.value)}` : "Volumen: nicht angegeben"}
                    {it.description ? ` • ${it.description}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => remove(it.id)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:border-rose-500 hover:text-rose-700"
                >
                  Löschen
                </button>
              </div>
            ))}
          </div>
        )}

        {open ? (
          <form onSubmit={add} className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-3">
            <div>
              <Label>Asset-Typ</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AssetTypeT)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Jahr</Label>
              <input
                type="number"
                min={1900}
                max={currentYear + 1}
                value={year}
                onChange={(e) => setYear(Number(e.target.value) || currentYear)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </div>
            <div>
              <Label>Rolle</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as TrackrecordRoleT)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                {TRACKRECORD_ROLES.map((r) => (
                  <option key={r} value={r}>{TRACKRECORD_ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Lage</Label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="z. B. Berlin, Charlottenburg"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
              />
            </div>
            <div>
              <Label>Volumen / Kaufpreis (EUR, optional)</Label>
              <input
                type="text"
                inputMode="numeric"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="z. B. 1500000"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
              />
            </div>
            <div className="md:col-span-3">
              <Label>Beschreibung (optional)</Label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="z. B. 18-Einheiten-MFH, Bestand modernisiert, Einkauf zum 18-fachen"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
              />
            </div>
            <div className="md:col-span-3 flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? "Lege an…" : "Hinzufügen"}
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setError(null); }}
                disabled={busy}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
              >
                Abbrechen
              </button>
              {error ? <span className="text-xs text-rose-600">{error}</span> : null}
            </div>
          </form>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            + Trackrecord-Eintrag
          </button>
        )}
      </div>
    </Card>
  );
}
