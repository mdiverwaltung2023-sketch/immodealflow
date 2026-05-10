"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import { Card, Button, Input, Textarea, Label } from "@/components/ui";
import {
  APPLICATION_STATUS_LABELS,
  APPLICANT_RATING_LABELS,
  type ApplicantRatingT,
  type ApplicationStatusT
} from "@/lib/api";

type Item = {
  id: string;
  createdAt: string;
  applicantName: string;
  status: ApplicationStatusT;
  monthlyNetIncome: number | null;
  householdSize: number | null;
  desiredMoveInDate: string | null;
  latestEvalRating?: ApplicantRatingT;
  latestEvalRecommendViewing: boolean | null;
  latestEvalSummary: string | null;
};

const STATUS_TONES: Record<ApplicationStatusT, string> = {
  NEW: "bg-zinc-100 text-zinc-700",
  REVIEWING: "bg-indigo-50 text-indigo-700",
  VIEWING: "bg-amber-50 text-amber-800",
  ACCEPTED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-rose-50 text-rose-700",
  WITHDRAWN: "bg-zinc-50 text-zinc-500"
};

const RATING_TONES: Record<ApplicantRatingT, string> = {
  SEHR_PASSEND: "bg-emerald-600 text-white",
  PASSEND: "bg-indigo-600 text-white",
  BEDINGT_PASSEND: "bg-amber-500 text-white",
  EHER_UNPASSEND: "bg-rose-600 text-white"
};

function eur(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

export function ApplicationsSection({
  unitId,
  initialApplications
}: {
  unitId: string;
  initialApplications: Item[];
}) {
  const apiFetch = useApiFetch();
  const router = useRouter();
  const [items] = useState<Item[]>(initialApplications);
  const [open, setOpen] = useState(false);

  // Form-State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [income, setIncome] = useState("");
  const [employment, setEmployment] = useState("");
  const [employmentDur, setEmploymentDur] = useState("");
  const [schufa, setSchufa] = useState("");
  const [household, setHousehold] = useState("");
  const [pets, setPets] = useState(false);
  const [petDetails, setPetDetails] = useState("");
  const [smoker, setSmoker] = useState(false);
  const [moveIn, setMoveIn] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    if (!name.trim()) {
      setErr("Name ist Pflicht.");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = { applicantName: name.trim() };
      if (email.trim()) body.email = email.trim();
      if (phone.trim()) body.phone = phone.trim();
      if (income.trim()) body.monthlyNetIncome = Math.round(Number(income));
      if (employment.trim()) body.employmentType = employment.trim();
      if (employmentDur.trim()) body.employmentDuration = employmentDur.trim();
      if (schufa.trim()) body.schufaScore = schufa.trim();
      if (household.trim()) body.householdSize = Math.round(Number(household));
      body.hasPets = pets;
      if (pets && petDetails.trim()) body.petDetails = petDetails.trim();
      body.smoker = smoker;
      if (moveIn.trim()) body.desiredMoveInDate = moveIn;
      if (duration.trim()) body.intendedDuration = duration.trim();
      if (notes.trim()) body.notes = notes.trim();

      const r = await apiFetch(`/me/rental-units/${unitId}/applications`, {
        method: "POST",
        body: JSON.stringify(body)
      });
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        setErr(j?.error ?? `Fehler ${r.status}`);
        return;
      }
      setOpen(false);
      // alle Felder leeren
      setName("");
      setEmail("");
      setPhone("");
      setIncome("");
      setEmployment("");
      setEmploymentDur("");
      setSchufa("");
      setHousehold("");
      setPets(false);
      setPetDetails("");
      setSmoker(false);
      setMoveIn("");
      setDuration("");
      setNotes("");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title={`Bewerber (${items.length})`}
      action={
        <Button onClick={() => setOpen((v) => !v)} variant="secondary">
          {open ? "Formular schließen" : "Bewerber hinzufügen"}
        </Button>
      }
    >
      {open ? (
        <form
          onSubmit={submit}
          className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3"
        >
          <div className="text-xs text-zinc-500">
            Pflichtfeld: Name. Alle anderen Angaben sind optional, helfen aber der
            KI-Bewertung. <strong>Bitte keine sensiblen Merkmale eintragen</strong>{" "}
            (Herkunft, Religion, Geschlecht etc.) — diese werden nicht bewertet.
          </div>
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Familie Müller"
              required
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>E-Mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kontakt@example.de"
              />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="030 123456"
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Haushaltsnetto (EUR/Monat)</Label>
              <Input
                type="number"
                min={0}
                step={50}
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="3500"
              />
            </div>
            <div>
              <Label>SCHUFA-Score</Label>
              <Input
                value={schufa}
                onChange={(e) => setSchufa(e.target.value)}
                placeholder="z. B. 97 % oder N/A"
              />
            </div>
            <div>
              <Label>Haushaltsgröße</Label>
              <Input
                type="number"
                min={1}
                value={household}
                onChange={(e) => setHousehold(e.target.value)}
                placeholder="2"
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Beschäftigungsart</Label>
              <Input
                value={employment}
                onChange={(e) => setEmployment(e.target.value)}
                placeholder="Festanstellung unbefristet"
              />
            </div>
            <div>
              <Label>Beschäftigungsdauer</Label>
              <Input
                value={employmentDur}
                onChange={(e) => setEmploymentDur(e.target.value)}
                placeholder="5 Jahre"
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Gewünschtes Einzugsdatum</Label>
              <Input
                type="date"
                value={moveIn}
                onChange={(e) => setMoveIn(e.target.value)}
              />
            </div>
            <div>
              <Label>Geplante Mietdauer</Label>
              <Input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="langfristig / 2-3 Jahre"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={pets}
                onChange={(e) => setPets(e.target.checked)}
              />
              Haustiere
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={smoker}
                onChange={(e) => setSmoker(e.target.checked)}
              />
              Raucher
            </label>
            {pets ? (
              <Input
                value={petDetails}
                onChange={(e) => setPetDetails(e.target.value)}
                placeholder="z. B. 1 Katze"
                className="max-w-xs"
              />
            ) : null}
          </div>
          <div>
            <Label>Notizen</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Bitte keine sensiblen Merkmale. Sonstige Hinweise zur Bewerbung."
            />
          </div>
          {err ? <div className="text-sm text-rose-600">{err}</div> : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Speichere …" : "Bewerber anlegen"}
            </Button>
          </div>
        </form>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-5 text-center text-sm text-zinc-500">
          Noch keine Bewerber. Über „Bewerber hinzufügen" oben einen anlegen.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200">
          {items.map((a) => (
            <li key={a.id} className="py-3">
              <Link
                href={`/rentals/${unitId}/applications/${a.id}`}
                className="block hover:bg-zinc-50 -mx-2 px-2 rounded-lg"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-sm font-semibold text-zinc-900">
                    {a.applicantName}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${STATUS_TONES[a.status]}`}
                    >
                      {APPLICATION_STATUS_LABELS[a.status]}
                    </span>
                    {a.latestEvalRating ? (
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wider ${RATING_TONES[a.latestEvalRating]}`}
                      >
                        {APPLICANT_RATING_LABELS[a.latestEvalRating]}
                      </span>
                    ) : (
                      <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-zinc-500">
                        keine KI-Bewertung
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span>Einkommen: {eur(a.monthlyNetIncome)}</span>
                  {a.householdSize != null ? (
                    <span>Haushalt: {a.householdSize} P.</span>
                  ) : null}
                  {a.desiredMoveInDate ? (
                    <span>
                      Einzug:{" "}
                      {new Date(a.desiredMoveInDate).toLocaleDateString("de-DE")}
                    </span>
                  ) : null}
                  <span className="text-zinc-400">
                    angelegt {new Date(a.createdAt).toLocaleDateString("de-DE")}
                  </span>
                </div>
                {a.latestEvalSummary ? (
                  <div className="mt-1 text-xs text-zinc-600 italic line-clamp-2">
                    {a.latestEvalSummary}
                  </div>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
