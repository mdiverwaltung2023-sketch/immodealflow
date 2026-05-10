"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import { USER_ROLE_LABELS, type UserRoleT } from "@/lib/api";
import { readStoredReferral, clearStoredReferral } from "@/components/ReferralCapture";

const ROLE_DESCRIPTIONS: Record<UserRoleT, string> = {
  INVESTOR:
    "Du analysierst Objekte, kaufst Immobilien und willst eine Pipeline plus Bietlimits für Versteigerungen.",
  SELLER:
    "Du verkaufst Objekte und möchtest Investoren mit passendem Profil (Trackrecord, Finanzierung) ansprechen.",
  BOTH:
    "Du nimmst mehrere Rollen ein. Du kannst oben in der Topbar zwischen Investor, Verkäufer, Vermieter und Mieter umschalten.",
  BROKER:
    "Du bist Makler nach §34c GewO und willst alle Bereiche begleiten — Verkauf, Vermietung und Investorenansprache.",
  LANDLORD:
    "Du vermietest Wohnungen oder Häuser und willst Bewerber strukturiert verwalten — mit KI-gestützter, diskriminierungs-freier Vorab-Bewertung.",
  TENANT:
    "Du suchst eine Mietwohnung. Du nutzt die öffentliche Mietbörse und kannst dich direkt bewerben."
};

const ROLES: UserRoleT[] = ["INVESTOR", "SELLER", "LANDLORD", "TENANT", "BOTH", "BROKER"];

export function OnboardingForm({ initial }: { initial: { name: string; role: UserRoleT } }) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [role, setRole] = useState<UserRoleT>(initial.role);
  const [name, setName] = useState(initial.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phase H7: Referral-ID aus localStorage (gesetzt durch ReferralCapture).
  const [referredBy, setReferredBy] = useState<string | null>(null);
  useEffect(() => {
    setReferredBy(readStoredReferral());
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body: Record<string, unknown> = { role };
      if (name.trim()) body.name = name.trim();
      if (referredBy) body.referredById = referredBy;
      const res = await apiFetch("/me/complete-onboarding", {
        method: "POST",
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Speichern fehlgeschlagen (${res.status}) ${txt.slice(0, 200)}`);
      }
      // Backend hat referredById gespeichert (oder ignoriert) — Key kann weg.
      clearStoredReferral();
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {referredBy ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-semibold">Empfehlung erkannt</div>
          <div className="mt-0.5 text-xs">
            Du wurdest eingeladen. Sobald du dein Profil ausfüllst und dein
            erstes Inserat aktivierst, bekommt der Werber 100 Coins.
          </div>
        </div>
      ) : null}

      <div>
        <label className="text-xs text-zinc-500">Anzeigename (optional)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Marco Dahm"
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {ROLES.map((r) => {
          const active = role === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-xl border p-4 text-left transition ${
                active
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <div className="text-sm font-semibold text-zinc-900">{USER_ROLE_LABELS[r]}</div>
              <div className="mt-2 text-xs text-zinc-500">{ROLE_DESCRIPTIONS[r]}</div>
              <div className={`mt-3 text-[10px] uppercase tracking-wide ${active ? "text-indigo-700" : "text-zinc-400"}`}>
                {active ? "Ausgewählt" : "Auswählen"}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? "Speichern…" : "Weiter zum Dashboard"}
        </button>
        {error ? <span className="text-xs text-rose-600">{error}</span> : null}
      </div>
    </form>
  );
}
