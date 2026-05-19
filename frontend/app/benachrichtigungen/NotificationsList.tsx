"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApiFetch } from "@/lib/client-fetch";
import { Button } from "@/components/ui";
import {
  USER_NOTIFICATION_KIND_LABELS,
  type UserNotificationListResponseT,
  type UserNotificationT
} from "@/lib/api";

function relTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `vor ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `vor ${h} h`;
  const days = Math.round(h / 24);
  if (days < 7) return `vor ${days} Tag${days === 1 ? "" : "en"}`;
  return d.toLocaleDateString("de-DE");
}

export function NotificationsList() {
  const apiFetch = useApiFetch();
  const [data, setData] = useState<UserNotificationListResponseT | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/me/notifications?limit=100");
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setErr(j?.error ?? `Fehler ${res.status}`);
        return;
      }
      const json = (await res.json()) as UserNotificationListResponseT;
      setData(json);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    }
  }, [apiFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string) {
    try {
      await apiFetch(`/me/notifications/${id}`, { method: "PATCH" });
      await load();
    } catch {
      /* noop */
    }
  }

  async function markAllRead() {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch("/me/notifications/mark-all-read", { method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (err) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {err}
      </div>
    );
  }

  if (!data) {
    return <div className="text-sm text-zinc-400">Lade …</div>;
  }

  const items = data.items;
  const unread = data.unreadCount;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-500">
          {unread > 0 ? (
            <span className="font-medium text-zinc-800">
              {unread} ungelesen
            </span>
          ) : (
            "Alle gelesen ✓"
          )}
          {" · "}
          {items.length} insgesamt
        </div>
        {unread > 0 ? (
          <Button variant="ghost" onClick={markAllRead} disabled={busy}>
            {busy ? "…" : "Alle als gelesen markieren"}
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
          Keine Benachrichtigungen — sobald jemand deine Dokumenten-Freigabe
          öffnet oder eine Anfrage stellt, taucht sie hier auf.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <NotificationRow
              key={n.id}
              n={n}
              onMarkRead={() => markRead(n.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function NotificationRow({
  n,
  onMarkRead
}: {
  n: UserNotificationT;
  onMarkRead: () => void;
}) {
  const isUnread = !n.readAt;
  const kindLabel = USER_NOTIFICATION_KIND_LABELS[n.kind];
  const tone =
    n.kind === "FIRST_BUYER_ACCESS"
      ? "border-indigo-200 bg-indigo-50/40"
      : n.kind === "INQUIRY_RECEIVED"
        ? "border-amber-200 bg-amber-50/40"
        : "border-zinc-200 bg-white";

  return (
    <li
      className={`rounded-xl border p-3 ${tone} ${
        isUnread ? "shadow-sm" : "opacity-75"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              {kindLabel}
            </span>
            {isUnread ? (
              <span className="inline-flex h-2 w-2 rounded-full bg-rose-500" />
            ) : null}
            <span className="text-[10px] text-zinc-400">
              {relTime(n.createdAt)}
            </span>
          </div>
          <div className="mt-1 text-sm font-medium text-zinc-900">
            {n.title}
          </div>
          {n.body ? (
            <div className="mt-0.5 text-xs text-zinc-600">{n.body}</div>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          {n.link ? (
            <Link
              href={n.link}
              onClick={onMarkRead}
              className="rounded-lg bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
            >
              Ansehen →
            </Link>
          ) : null}
          {isUnread ? (
            <button
              type="button"
              onClick={onMarkRead}
              className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Gelesen
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
