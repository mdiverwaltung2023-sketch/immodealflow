"use client";

import { useEffect, useRef, useState } from "react";
import { useApiFetch } from "@/lib/client-fetch";
import { OffmarketMessageSchema, type OffmarketMessageT } from "@/lib/api";
import { z } from "zod";

const ResponseSchema = z.object({ messages: z.array(OffmarketMessageSchema) });

export function ChatThread({ inviteId }: { inviteId: string }) {
  const apiFetch = useApiFetch();
  const [messages, setMessages] = useState<OffmarketMessageT[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await apiFetch(`/me/offmarket-invites/${inviteId}/messages`);
      if (!res.ok) return;
      const json = await res.json();
      const parsed = ResponseSchema.parse(json);
      setMessages(parsed.messages);
    } catch {
      /* polling ist tolerant */
    }
  }

  async function loadMe() {
    try {
      const res = await apiFetch("/me");
      if (!res.ok) return;
      const j = await res.json();
      setMe(j.id);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadMe();
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setErr(null);
    try {
      const res = await apiFetch(`/me/offmarket-invites/${inviteId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body })
      });
      if (!res.ok) throw new Error(await res.text());
      setBody("");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-5 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
          Direktnachricht
        </div>
        <div className="text-sm text-zinc-700">
          Sicherer 1:1-Chat. Nur Sie und Ihr Gegenüber sehen den Verlauf.
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400">
            Noch keine Nachrichten — Sie können den Anfang machen.
          </div>
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => {
              const mine = m.senderId === me;
              return (
                <li key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      mine
                        ? "max-w-[75%] rounded-2xl rounded-br-sm bg-amber-100 px-3 py-2 text-sm text-amber-900"
                        : "max-w-[75%] rounded-2xl rounded-bl-sm bg-zinc-100 px-3 py-2 text-sm text-zinc-800"
                    }
                  >
                    <div className="whitespace-pre-line">{m.body}</div>
                    <div className="mt-0.5 text-right text-[10px] opacity-60">
                      {new Date(m.createdAt).toLocaleTimeString("de-DE", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={send}
        className="flex items-center gap-2 border-t border-zinc-100 px-3 py-3"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Nachricht schreiben..."
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Senden
        </button>
      </form>
      {err && (
        <div className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {err}
        </div>
      )}
    </div>
  );
}
