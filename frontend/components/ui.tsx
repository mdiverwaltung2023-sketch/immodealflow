"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import type { DealStatus } from "@/lib/api";
import { STATUS_LABELS } from "@/lib/api";

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border bg-zinc-950/40 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
      {title ? <div className="mb-4 text-sm font-semibold text-white">{title}</div> : null}
      {children}
    </div>
  );
}

export function Button({
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-white text-zinc-950 hover:bg-zinc-200"
      : variant === "danger"
        ? "bg-rose-500 text-white hover:bg-rose-600"
        : variant === "ghost"
          ? "bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white"
          : "bg-zinc-900 text-white hover:bg-zinc-800";
  return <button {...props} className={`${base} ${styles} ${props.className ?? ""}`} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-xl border bg-zinc-950 px-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-[80px] w-full rounded-xl border bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-10 w-full rounded-xl border bg-zinc-950 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${props.className ?? ""}`}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="mb-1 text-xs font-medium text-zinc-400">{children}</div>;
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border bg-zinc-950 p-3">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

const STATUS_BADGE_STYLES: Record<DealStatus, string> = {
  WATCHING: "bg-zinc-800 text-zinc-200 border-zinc-700",
  INQUIRED: "bg-blue-950 text-blue-300 border-blue-900",
  NEGOTIATING: "bg-amber-950 text-amber-300 border-amber-900",
  LOI: "bg-purple-950 text-purple-300 border-purple-900",
  NOTAR: "bg-indigo-950 text-indigo-300 border-indigo-900",
  CLOSED: "bg-emerald-950 text-emerald-300 border-emerald-900",
  REJECTED: "bg-rose-950 text-rose-300 border-rose-900"
};

export function StatusBadge({ status, size = "md" }: { status: DealStatus; size?: "sm" | "md" }) {
  const sizeCls = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${sizeCls} ${STATUS_BADGE_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
