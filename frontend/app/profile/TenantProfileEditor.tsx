"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Input, Textarea, Label } from "@/components/ui";
import { useApiFetch } from "@/lib/client-fetch";
import {
  PROFILE_VISIBILITY_LABELS,
  ProfileVisibilityEnum,
  type ProfileVisibilityT,
  type TenantProfileT
} from "@/lib/api";

const VISIBILITY_OPTIONS = ProfileVisibilityEnum.options;

const VISIBILITY_DESCRIPTIONS: Record<ProfileVisibilityT, string> = {
  PRIVATE:
    "Nur du siehst dein Mieter-Profil. Vermieter sehen die Daten erst, wenn du dich auf eine Wohnung bewirbst.",
  ON_REQUEST:
    "Vermieter sehen dein Mieter-Profil erst, wenn du dich auf ihre Wohnung bewirbst.",
  PUBLIC:
    "Eingeloggte Vermieter können dein Mieter-Profil jederzeit sehen — gut, wenn du proaktiv gefunden werden möchtest."
};

function intInput(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}
function floatInput(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Mieter-Profil-Editor (Phase L8). Wirtschaftliche & organisatorische
 * Selbstauskunft + Wunschkriterien — strikt AGG-konform, keine
 * sensiblen Merkmale.
 */
export function TenantProfileEditor({ initial }: { initial: TenantProfileT }) {
  const apiFetch = useApiFetch();
  const router = useRouter();

  // Eckdaten
  const [aboutText, setAboutText] = useState(initial.aboutText ?? "");
  const [employmentType, setEmploymentType] = useState(initial.employmentType ?? "");
  const [employmentDuration, setEmploymentDuration] = useState(
    initial.employmentDuration ?? ""
  );
  const [employer, setEmployer] = useState(initial.employer ?? "");
  const [monthlyNetIncome, setMonthlyNetIncome] = useState(
    initial.monthlyNetIncome != null ? String(initial.monthlyNetIncome) : ""
  );
  const [additionalIncome, setAdditionalIncome] = useState(
    initial.additionalIncome != null ? String(initial.additionalIncome) : ""
  );
  const [schufaScore, setSchufaScore] = useState(initial.schufaScore ?? "");
  const [hasSchufaCert, setHasSchufaCert] = useState(initial.hasSchufaCert);

  // Haushalt
  const [householdSize, setHouseholdSize] = useState(
    initial.householdSize != null ? String(initial.householdSize) : ""
  );
  const [hasPets, setHasPets] = useState(initial.hasPets);
  const [petDetails, setPetDetails] = useState(initial.petDetails ?? "");
  const [smoker, setSmoker] = useState(initial.smoker);

  // Wunschkriterien
  const [desiredCity, setDesiredCity] = useState(initial.desiredCity ?? "");
  const [desiredAreaMin, setDesiredAreaMin] = useState(
    initial.desiredAreaMin != null ? String(initial.desiredAreaMin) : ""
  );
  const [desiredRoomsMin, setDesiredRoomsMin] = useState(
    initial.desiredRoomsMin != null ? String(initial.desiredRoomsMin) : ""
  );
  const [desiredRentMax, setDesiredRentMax] = useState(
    initial.desiredRentMax != null ? String(initial.desiredRentMax) : ""
  );
  const [desiredMoveInDate, setDesiredMoveInDate] = useState(
    initial.desiredMoveInDate ? initial.desiredMoveInDate.slice(0, 10) : ""
  );
  const [intendedDuration, setIntendedDuration] = useState(
    initial.intendedDuration ?? ""
  );
  const [openForFurnished, setOpenForFurnished] = useState(initial.openForFurnished);
  const [needsBarrierFree, setNeedsBarrierFree] = useState(initial.needsBarrierFree);
  const [needsParking, setNeedsParking] = useState(initial.needsParking);

  const [visibility, setVisibility] = useState<ProfileVisibilityT>(initial.visibility);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        aboutText: aboutText.trim() || null,
        employmentType: employmentType.trim() || null,
        employmentDuration: employmentDuration.trim() || null,
        employer: employer.trim() || null,
        monthlyNetIncome: intInput(monthlyNetIncome),
        additionalIncome: intInput(additionalIncome),
        schufaScore: schufaScore.trim() || null,
        hasSchufaCert,
        householdSize: intInput(householdSize),
        hasPets,
        petDetails: hasPets ? petDetails.trim() || null : null,
        smoker,
        desiredCity: desiredCity.trim() || null,
        desiredAreaMin: floatInput(desiredAreaMin),
        desiredRoomsMin: floatInput(desiredRoomsMin),
        desiredRentMax: intInput(desiredRentMax),
        desiredMoveInDate: desiredMoveInDate || null,
        intendedDuration: intendedDuration.trim() || null,
        openForFurnished,
        needsBarrierFree,
        needsParking,
        visibility
      };
      const r = await apiFetch("/me/tenant-profile", {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        setErr(j?.error ?? `Fehler ${r.status}`);
        return;
      }
      setSavedAt(new Date());
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Mieter-Profil">
      <form onSubmit={save} className="space-y-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-snug text-amber-900">
          <strong>AGG-Hinweis.</strong> Hier werden bewusst <em>keine</em>{" "}
          sensiblen Merkmale erhoben (Herkunft, Religion, Familienstand,
          Geschlecht, Alter, Behinderung). Du selbst entscheidest, was du im
          Freitextfeld „Über mich" preisgibst.
        </div>

        {/* Selbstvorstellung */}
        <div>
          <Label>Über mich (optional)</Label>
          <Textarea
            value={aboutText}
            onChange={(e) => setAboutText(e.target.value)}
            placeholder="Was sollen Vermieter über dich wissen? Beruf, Hobbys, Wohnerfahrung — du entscheidest, was du teilst."
            rows={4}
          />
        </div>

        {/* Wirtschaftliche Eckdaten */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Wirtschaftliche Eckdaten
          </div>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <div>
              <Label>Anstellungsart</Label>
              <Input
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                placeholder="Festanstellung / Selbstständig / Beamter"
              />
            </div>
            <div>
              <Label>Beschäftigungsdauer</Label>
              <Input
                value={employmentDuration}
                onChange={(e) => setEmploymentDuration(e.target.value)}
                placeholder="seit 3 Jahren"
              />
            </div>
            <div>
              <Label>Arbeitgeber (optional)</Label>
              <Input
                value={employer}
                onChange={(e) => setEmployer(e.target.value)}
                placeholder="z.B. Siemens AG"
              />
            </div>
            <div>
              <Label>Haushaltsnetto (€/Monat)</Label>
              <Input
                type="number"
                min={0}
                step={50}
                value={monthlyNetIncome}
                onChange={(e) => setMonthlyNetIncome(e.target.value)}
                placeholder="3500"
              />
            </div>
            <div>
              <Label>Zusatzeinkommen (€/Monat, optional)</Label>
              <Input
                type="number"
                min={0}
                step={50}
                value={additionalIncome}
                onChange={(e) => setAdditionalIncome(e.target.value)}
                placeholder="z.B. Kapitaleinkünfte"
              />
            </div>
            <div>
              <Label>SCHUFA / Bonität</Label>
              <Input
                value={schufaScore}
                onChange={(e) => setSchufaScore(e.target.value)}
                placeholder="Score 95 / saubere Auskunft"
              />
            </div>
          </div>
          <label className="mt-3 inline-flex items-center gap-2 text-xs text-zinc-700">
            <input
              type="checkbox"
              checked={hasSchufaCert}
              onChange={(e) => setHasSchufaCert(e.target.checked)}
              className="rounded border-zinc-300"
            />
            <span>SCHUFA-Selbstauskunft liegt vor (kann auf Anfrage geteilt werden)</span>
          </label>
        </div>

        {/* Haushalt */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Haushalt
          </div>
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            <div>
              <Label>Personen im Haushalt</Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={householdSize}
                onChange={(e) => setHouseholdSize(e.target.value)}
                placeholder="2"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasPets}
                onChange={(e) => setHasPets(e.target.checked)}
                className="rounded border-zinc-300"
              />
              <span>Haustier(e)</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={smoker}
                onChange={(e) => setSmoker(e.target.checked)}
                className="rounded border-zinc-300"
              />
              <span>Raucher</span>
            </label>
          </div>
          {hasPets ? (
            <div className="mt-3">
              <Label>Haustier-Details</Label>
              <Input
                value={petDetails}
                onChange={(e) => setPetDetails(e.target.value)}
                placeholder="z.B. 1 kleiner Hund (Pudel, ruhig)"
              />
            </div>
          ) : null}
        </div>

        {/* Wunschkriterien */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Wunschkriterien
          </div>
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            <div>
              <Label>Wunsch-Stadt</Label>
              <Input
                value={desiredCity}
                onChange={(e) => setDesiredCity(e.target.value)}
                placeholder="Berlin"
              />
            </div>
            <div>
              <Label>Min. Fläche (m²)</Label>
              <Input
                type="number"
                min={0}
                step={5}
                value={desiredAreaMin}
                onChange={(e) => setDesiredAreaMin(e.target.value)}
              />
            </div>
            <div>
              <Label>Min. Zimmer</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={desiredRoomsMin}
                onChange={(e) => setDesiredRoomsMin(e.target.value)}
              />
            </div>
            <div>
              <Label>Max. Kaltmiete (€)</Label>
              <Input
                type="number"
                min={0}
                step={50}
                value={desiredRentMax}
                onChange={(e) => setDesiredRentMax(e.target.value)}
              />
            </div>
            <div>
              <Label>Wunsch-Einzug</Label>
              <Input
                type="date"
                value={desiredMoveInDate}
                onChange={(e) => setDesiredMoveInDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Mietdauer</Label>
              <Input
                value={intendedDuration}
                onChange={(e) => setIntendedDuration(e.target.value)}
                placeholder="langfristig / 2+ Jahre"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={openForFurnished}
                onChange={(e) => setOpenForFurnished(e.target.checked)}
                className="rounded border-zinc-300"
              />
              <span>Auch möbliert OK</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={needsBarrierFree}
                onChange={(e) => setNeedsBarrierFree(e.target.checked)}
                className="rounded border-zinc-300"
              />
              <span>Barrierefrei nötig</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={needsParking}
                onChange={(e) => setNeedsParking(e.target.checked)}
                className="rounded border-zinc-300"
              />
              <span>Stellplatz nötig</span>
            </label>
          </div>
        </div>

        {/* Sichtbarkeit */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Sichtbarkeit
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            {VISIBILITY_OPTIONS.map((opt) => (
              <label
                key={opt}
                className={`cursor-pointer rounded-xl border p-3 text-xs transition ${
                  visibility === opt
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <input
                  type="radio"
                  name="tenant-visibility"
                  value={opt}
                  checked={visibility === opt}
                  onChange={() => setVisibility(opt)}
                  className="sr-only"
                />
                <div className="text-sm font-semibold text-zinc-900">
                  {PROFILE_VISIBILITY_LABELS[opt]}
                </div>
                <div className="mt-1 text-[11px] text-zinc-600">
                  {VISIBILITY_DESCRIPTIONS[opt]}
                </div>
              </label>
            ))}
          </div>
        </div>

        {err ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {err}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
          {savedAt ? (
            <div className="text-[11px] text-emerald-700">
              Gespeichert um {savedAt.toLocaleTimeString("de-DE")}
            </div>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Speichern …" : "Mieter-Profil speichern"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
