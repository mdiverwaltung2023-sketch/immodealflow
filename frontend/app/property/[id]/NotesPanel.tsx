"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@/components/ui";
import type { z } from "zod";
import { NoteSchema } from "@/lib/api";
import { useApiFetch } from "@/lib/client-fetch";

type Note = z.infer<typeof NoteSchema>;

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

export function NotesPanel({ id, initialNotes }: { id: string; initialNotes: Note[] }) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch(`/properties/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ body: body.trim() })
      });
      if (!res.ok) throw new Error(`POST fehlgeschlagen (${res.status})`);
      const created = NoteSchema.parse(await res.json());
      setNotes((prev) => [created, ...prev]);
      setBody("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function deleteNote(noteId: string) {
    if (!confirm("Notiz wirklich löschen?")) return;
    setError(null);
    try {
      const res = await apiFetch(`/notes/${noteId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`DELETE fehlgeschlagen (${res.status})`);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addNote} className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Neue Notiz (z. B. Telefonat mit Verkäufer, gefordert 245k, Rückruf am Freitag …)"
          disabled={busy}
        />
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={busy || !body.trim()}>
            {busy ? "Speichere…" : "Notiz hinzufügen"}
          </Button>
          {error ? <div className="text-sm text-rose-600">{error}</div> : null}
        </div>
      </form>

      {notes.length === 0 ? (
        <div className="text-sm text-zinc-500">Noch keine Notizen.</div>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="text-xs text-zinc-500">{formatDate(n.createdAt)}</div>
                <button
                  onClick={() => deleteNote(n.id)}
                  className="text-xs text-zinc-500 hover:text-rose-600"
                  title="Notiz löschen"
                >
                  Löschen
                </button>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">{n.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
