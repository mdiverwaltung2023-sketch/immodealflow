"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useApiFetch } from "@/lib/client-fetch";
import { CoInvestMessageSchema, type CoInvestMessageT } from "@/lib/api";

const ResponseSchema = z.object({ messages: z.array(CoInvestMessageSchema) });

export function DealRoomChat({ interestId }: { interestId: string }) {
  const apiFetch = useApiFetch();
  const [messages, setMessages] = useState<CoInvestMessageT[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await apiFetch(`/me/coinvest-interests/${interestId}/messages`);
      if (!res.ok) return;
      const parsed = ResponseSchema.parse(await res.json());
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
  }, [interestId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setErr(null);
    try {
      const res = await apiFetch(`/me/coinvest-interests/${interestId}/messages`, {
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
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">Deal-Room</div>
        <div className="text-sm text-slate-600">Sicherer 1:1-Chat. Nur ihr beide seht den Verlauf.</div>
      </div>

      <div className="max-h-96 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Noch keine Nachrichten — mach den Anfang.
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
                        ? "max-w-[75%] rounded-2xl rounded-br-sm bg-teal-100 px-3 py-2 text-sm text-teal-900"
                        : "max-w-[75%] rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-sm text-slate-800"
                    }
                  >
                    <div className="whitespace-pre-line">{m.body}</div>
                    <div className="mt-0.5 text-right text-[10px] opacity-60">
                      {new Date(m.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex items-center gap-2 border-t border-slate-100 px-3 py-3">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Nachricht schreiben …"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          Senden
        </button>
      </form>
      {err && <div className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
    </div>
  );
}
