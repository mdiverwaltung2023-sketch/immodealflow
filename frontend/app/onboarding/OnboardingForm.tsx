"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import { USER_ROLE_LABELS, type UserRoleT } from "@/lib/api";

const ROLE_DESCRIPTIONS: Record<UserRoleT, string> = {
  INVESTOR:
    "Du analysierst Objekte, kaufst MFH/Gewerbe und willst eine Pipeline plus Bietlimits für Versteigerungen.",
  SELLER:
    "Du verkaufst Objekte und möchtest Investoren mit passendem Profil (Trackrecord, Finanzierung) ansprechen.",
  BOTH:
    "Du machst beides — als Eigentümer und als aktiver Investor."
};

const ROLES: UserRoleT[] = ["INVESTOR", "SELLER", "BOTH"];

export function OnboardingForm({ initial }: { initial: { name: string; role: UserRoleT } }) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [role, setRole] = useState<UserRoleT>(initial.role);
  const [name, setName] = useState(initial.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body: Record<string, unknown> = { role };
      if (name.trim()) body.name = name.trim();
      const res = await apiFetch("/me/complete-onboarding", {
        method: "POST",
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Speichern fehlgeschlagen (${res.status}) ${txt.slice(0, 200)}`);
      }
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
      <div>
        <label className="text-xs text-zinc-400">Anzeigename (optional)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Marco Dahm"
          className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {ROLES.map((r) => {
          const active = role === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-xl border p-4 text-left transition ${
                active
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
              }`}
            >
              <div className="text-sm font-semibold text-white">{USER_ROLE_LABELS[r]}</div>
              <div className="mt-2 text-xs text-zinc-400">{ROLE_DESCRIPTIONS[r]}</div>
              <div className={`mt-3 text-[10px] uppercase tracking-wide ${active ? "text-indigo-300" : "text-zinc-600"}`}>
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
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
        >
          {busy ? "Speichern…" : "Weiter zum Dashboard"}
        </button>
        {error ? <span className="text-xs text-rose-300">{error}</span> : null}
      </div>
    </form>
  );
}
