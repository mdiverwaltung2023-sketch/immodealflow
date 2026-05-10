"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import { Button, Input, Textarea, Label } from "@/components/ui";

export function ApplyModal({
  unitId,
  unitTitle,
  defaultName,
  defaultEmail
}: {
  unitId: string;
  unitTitle: string;
  defaultName: string;
  defaultEmail: string;
}) {
  const apiFetch = useApiFetch();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    if (!name.trim()) {
      setErr("Bitte gib deinen Namen an.");
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

      const r = await apiFetch(`/rental-marketplace/${unitId}/apply`, {
        method: "POST",
        body: JSON.stringify(body)
      });
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        setErr(j?.error ?? `Fehler ${r.status}`);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Jetzt bewerben
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-zinc-200 px-5 py-4">
              <div>
                <div className="text-base font-semibold text-zinc-900">
                  Bewerbung einreichen
                </div>
                <div className="text-xs text-zinc-500">{unitTitle}</div>
              </div>
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Schließen"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4 p-5">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-snug text-amber-900">
                <strong>Hinweis (AGG):</strong> Bitte trage <em>keine</em>{" "}
                sensiblen Merkmale ein (Herkunft, Religion, Familienstand,
                Geschlecht, Behinderung, Alter etc.) — diese werden weder
                erhoben noch bewertet. Pflichtfeld ist nur dein Name.
              </div>

              <div>
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Vor- und Nachname"
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
                    placeholder="du@example.de"
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
                  <Label>Haushaltsnetto (€/Monat)</Label>
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
                  <Label>Anstellungsart</Label>
                  <Input
                    value={employment}
                    onChange={(e) => setEmployment(e.target.value)}
                    placeholder="Festanstellung"
                  />
                </div>
                <div>
                  <Label>Beschäftigungsdauer</Label>
                  <Input
                    value={employmentDur}
                    onChange={(e) => setEmploymentDur(e.target.value)}
                    placeholder="seit 3 Jahren"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>SCHUFA / Bonität</Label>
                  <Input
                    value={schufa}
                    onChange={(e) => setSchufa(e.target.value)}
                    placeholder="z.B. Score 95% / saubere Auskunft"
                  />
                </div>
                <div>
                  <Label>Personen im Haushalt</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={household}
                    onChange={(e) => setHousehold(e.target.value)}
                    placeholder="2"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Wunsch-Einzugsdatum</Label>
                  <Input
                    type="date"
                    value={moveIn}
                    onChange={(e) => setMoveIn(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Gewünschte Mietdauer</Label>
                  <Input
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="langfristig / 2+ Jahre"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pets}
                    onChange={(e) => setPets(e.target.checked)}
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

              {pets ? (
                <div>
                  <Label>Haustier-Details</Label>
                  <Input
                    value={petDetails}
                    onChange={(e) => setPetDetails(e.target.value)}
                    placeholder="z.B. 1 kleiner Hund (Pudel, ruhig)"
                  />
                </div>
              ) : null}

              <div>
                <Label>Notizen für den Vermieter (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Was soll der Vermieter über euch wissen? (Beruf, Hobbys, warum diese Wohnung)"
                  rows={4}
                />
              </div>

              {err ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  {err}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => !busy && setOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Sende ..." : "Bewerbung absenden"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
