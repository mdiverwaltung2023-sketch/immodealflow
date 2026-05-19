"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApiFetch } from "@/lib/client-fetch";
import { Button, Input, Textarea, Label } from "@/components/ui";
import {
  SALE_DOC_LABELS,
  SALE_DOC_ORDER,
  type BuyerDocAccessT,
  type SaleDocKindT
} from "@/lib/api";

/**
 * Phase M2 — Dokumenten-Freigaben pro Listing verwalten.
 *
 * Verkäufer erstellt pro Kaufinteressent eine Freigabe:
 *  - Auswahl aus allen 14 SaleDocKind-Kategorien
 *  - Optional Buyer-Label / Email als Eigennotiz
 *  - Optional Ablaufdatum
 *  - Antwort enthält Token + Link "/zugang/<token>" — kopierbar
 *
 * Bestehende Freigaben werden mit Status + Audit (accessCount /
 * lastAccessedAt) angezeigt, plus Aktionen Widerrufen / Löschen.
 */

export function BuyerAccessManager({ listingId }: { listingId: string }) {
  const apiFetch = useApiFetch();

  const [list, setList] = useState<BuyerDocAccessT[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch(`/me/listings/${listingId}/buyer-access`);
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setError(j?.error ?? `Fehler ${res.status}`);
        return;
      }
      const json = (await res.json()) as BuyerDocAccessT[];
      setList(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    }
  }, [apiFetch, listingId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-900">
            Dokumenten-Freigaben für Kaufinteressenten
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Pro Interessent ein Token-Link, der ausgewählte Unterlagen ohne
            Account abrufbar macht. Du kannst jederzeit widerrufen.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpenCreate(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          + Neue Freigabe
        </button>
      </div>

      {error ? (
        <div className="mt-3 rounded bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      {list === null ? (
        <div className="mt-4 text-xs text-zinc-400">Lade Freigaben …</div>
      ) : list.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
          Noch keine Freigaben. Sobald du eine erstellst, taucht hier ein
          kopierbarer Link auf.
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {list.map((acc) => (
            <AccessRow key={acc.id} access={acc} onChanged={refresh} />
          ))}
        </ul>
      )}

      {openCreate ? (
        <CreateModal
          listingId={listingId}
          onClose={() => setOpenCreate(false)}
          onCreated={refresh}
        />
      ) : null}
    </div>
  );
}

function AccessRow({
  access,
  onChanged
}: {
  access: BuyerDocAccessT;
  onChanged: () => void | Promise<void>;
}) {
  const apiFetch = useApiFetch();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const isRevoked = !!access.revokedAt;
  const isExpired =
    !!access.expiresAt && new Date(access.expiresAt).getTime() < Date.now();

  const status = isRevoked ? "Widerrufen" : isExpired ? "Abgelaufen" : "Aktiv";
  const statusColor = isRevoked
    ? "bg-zinc-100 text-zinc-500"
    : isExpired
      ? "bg-amber-100 text-amber-800"
      : "bg-emerald-100 text-emerald-700";

  const url = useMemo(() => {
    if (typeof window === "undefined") return `/zugang/${access.token}`;
    return `${window.location.origin}/zugang/${access.token}`;
  }, [access.token]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  }

  async function revoke() {
    if (busy) return;
    if (!confirm("Freigabe widerrufen? Der Link wird sofort ungültig.")) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/me/buyer-access/${access.id}`, {
        method: "PATCH",
        body: JSON.stringify({ revoke: true })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        alert(j?.error ?? `Fehler ${res.status}`);
        return;
      }
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function unrevoke() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/me/buyer-access/${access.id}`, {
        method: "PATCH",
        body: JSON.stringify({ revoke: false })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        alert(j?.error ?? `Fehler ${res.status}`);
        return;
      }
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function hardDelete() {
    if (busy) return;
    if (!confirm("Freigabe endgültig löschen? Das ist nicht rückgängig.")) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/me/buyer-access/${access.id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        alert(j?.error ?? `Fehler ${res.status}`);
        return;
      }
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900">
              {access.buyerLabel || "Ohne Label"}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusColor}`}
            >
              {status}
            </span>
            {access.buyerEmail ? (
              <span className="text-[11px] text-zinc-500">{access.buyerEmail}</span>
            ) : null}
          </div>
          <div className="mt-0.5 text-[11px] text-zinc-500">
            {access.allowedDocKinds.length} Kategorie(n) ·{" "}
            {access.accessCount} Abruf(e)
            {access.lastAccessedAt
              ? ` · zuletzt ${new Date(access.lastAccessedAt).toLocaleString("de-DE")}`
              : ""}
            {access.expiresAt
              ? ` · Ablauf ${new Date(access.expiresAt).toLocaleDateString("de-DE")}`
              : ""}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1">
          <button
            type="button"
            onClick={copy}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
          >
            {copied ? "Kopiert ✓" : "Link kopieren"}
          </button>
          {isRevoked ? (
            <button
              type="button"
              onClick={unrevoke}
              disabled={busy}
              className="rounded-lg border border-emerald-300 bg-white px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              Reaktivieren
            </button>
          ) : (
            <button
              type="button"
              onClick={revoke}
              disabled={busy}
              className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
            >
              Widerrufen
            </button>
          )}
          <button
            type="button"
            onClick={hardDelete}
            disabled={busy}
            className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
          >
            Löschen
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <code className="block min-w-0 grow truncate rounded bg-zinc-100 px-2 py-1 text-[11px] text-zinc-600">
          {url}
        </code>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {access.allowedDocKinds.map((k: SaleDocKindT) => (
          <span
            key={k}
            className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] text-zinc-600"
          >
            {SALE_DOC_LABELS[k]}
          </span>
        ))}
      </div>
    </li>
  );
}

function CreateModal({
  listingId,
  onClose,
  onCreated
}: {
  listingId: string;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const apiFetch = useApiFetch();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<SaleDocKindT>>(new Set());
  const [buyerLabel, setBuyerLabel] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<string>("");

  // Erfolgs-Sicht
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [createdCopied, setCreatedCopied] = useState(false);

  function toggle(k: SaleDocKindT) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(SALE_DOC_ORDER));
  }
  function clearAll() {
    setSelected(new Set());
  }

  async function submit() {
    if (busy) return;
    if (selected.size === 0) {
      setErr("Mindestens eine Kategorie auswählen.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        allowedDocKinds: Array.from(selected)
      };
      if (buyerLabel.trim()) body.buyerLabel = buyerLabel.trim();
      if (buyerEmail.trim()) body.buyerEmail = buyerEmail.trim();
      if (notes.trim()) body.notes = notes.trim();
      if (expiresInDays.trim()) {
        const days = Number(expiresInDays);
        if (!Number.isFinite(days) || days < 1) {
          setErr("Ablauf-Tage muss eine positive Zahl sein.");
          setBusy(false);
          return;
        }
        const d = new Date();
        d.setDate(d.getDate() + Math.round(days));
        body.expiresAt = d.toISOString();
      }
      const res = await apiFetch(`/me/listings/${listingId}/buyer-access`, {
        method: "POST",
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setErr(j?.error ?? `Fehler ${res.status}`);
        return;
      }
      const acc = (await res.json()) as BuyerDocAccessT;
      const link = `${window.location.origin}/zugang/${acc.token}`;
      setCreatedLink(link);
      await onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!createdLink) return;
    try {
      await navigator.clipboard.writeText(createdLink);
      setCreatedCopied(true);
      setTimeout(() => setCreatedCopied(false), 1500);
    } catch {
      /* noop */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-200 p-5">
          <div className="text-lg font-semibold text-zinc-900">
            {createdLink ? "Freigabe erstellt" : "Neue Dokumenten-Freigabe"}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {createdLink
              ? "Kopiere den Link und schicke ihn dem Interessenten — per Mail, WhatsApp oder direkt."
              : "Wähle aus, welche Kategorien dieser Interessent sehen darf."}
          </div>
        </div>

        {createdLink ? (
          <div className="space-y-4 p-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                Link
              </div>
              <code className="mt-2 block break-all rounded bg-white px-3 py-2 text-xs text-zinc-700">
                {createdLink}
              </code>
              <div className="mt-3 flex gap-2">
                <Button onClick={copyLink} variant="primary">
                  {createdCopied ? "Kopiert ✓" : "Link kopieren"}
                </Button>
                <a
                  href={createdLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Vorschau öffnen ↗
                </a>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={onClose}>Fertig</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 p-5">
              <div>
                <div className="flex items-baseline justify-between">
                  <Label>Freigegebene Kategorien</Label>
                  <div className="flex gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-indigo-600 hover:underline"
                    >
                      Alle
                    </button>
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-zinc-500 hover:underline"
                    >
                      Keine
                    </button>
                  </div>
                </div>
                <div className="mt-2 grid max-h-72 grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-2 md:grid-cols-2">
                  {SALE_DOC_ORDER.map((k) => {
                    const on = selected.has(k);
                    return (
                      <label
                        key={k}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition ${
                          on
                            ? "border-indigo-300 bg-indigo-50 text-indigo-900"
                            : "border-transparent bg-white text-zinc-700 hover:border-zinc-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle(k)}
                          className="h-4 w-4 rounded border-zinc-300 text-indigo-600"
                        />
                        <span className="truncate">{SALE_DOC_LABELS[k]}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-1 text-[10px] text-zinc-400">
                  {selected.size} von {SALE_DOC_ORDER.length} ausgewählt
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label>Buyer-Label (für deine Übersicht)</Label>
                  <Input
                    value={buyerLabel}
                    onChange={(e) => setBuyerLabel(e.target.value)}
                    placeholder="z. B. Familie Müller, Termin 25.05."
                  />
                </div>
                <div>
                  <Label>Buyer-Email (optional)</Label>
                  <Input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label>Ablauf in Tagen (optional)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    placeholder="z. B. 14"
                  />
                </div>
                <div>
                  <Label>Interne Notiz</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="z. B. Vorbereitung Besichtigung Sa"
                  />
                </div>
              </div>

              {err ? (
                <div className="rounded bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {err}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 p-4">
              <Button variant="ghost" onClick={onClose} disabled={busy}>
                Abbrechen
              </Button>
              <Button onClick={submit} disabled={busy || selected.size === 0}>
                {busy ? "Erstelle …" : "Freigabe erstellen"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
