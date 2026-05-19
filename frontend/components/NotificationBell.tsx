"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApiFetch } from "@/lib/client-fetch";

/**
 * Phase M3 — Notification-Bell im TopBar.
 *
 * Pollt alle 30 Sekunden `/me/notifications?unreadOnly=true&limit=1` und
 * zeigt einen roten Badge mit `unreadCount`. Klick fuehrt auf
 * `/benachrichtigungen`.
 *
 * Pragmatisch: kein WebSocket, kein Server-Sent-Events — Polling ist
 * fuer den Use-Case (max paar Notifications pro Tag) voellig ausreichend
 * und ueberlebt Vercel-Serverless-Cold-Starts unproblematisch.
 */
export function NotificationBell() {
  const apiFetch = useApiFetch();
  const [unread, setUnread] = useState<number>(0);

  const tick = useCallback(async () => {
    try {
      const res = await apiFetch("/me/notifications?unreadOnly=true&limit=1");
      if (!res.ok) return;
      const json = (await res.json()) as { unreadCount?: number };
      setUnread(json.unreadCount ?? 0);
    } catch {
      /* leise */
    }
  }, [apiFetch]);

  useEffect(() => {
    void tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [tick]);

  const hasUnread = unread > 0;

  return (
    <Link
      href="/benachrichtigungen"
      title={hasUnread ? `${unread} ungelesene Benachrichtigung(en)` : "Benachrichtigungen"}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {hasUnread ? (
        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white shadow">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
