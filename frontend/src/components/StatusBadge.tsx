import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/types";

const CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  paid:      { label: "Bezahlt",     className: "bg-emerald-50 text-emerald-700 ring-emerald-200"  },
  processed: { label: "Verarbeitet", className: "bg-blue-50    text-blue-700    ring-blue-200"     },
  pending:   { label: "Ausstehend",  className: "bg-amber-50   text-amber-700   ring-amber-200"    },
  error:     { label: "Fehler",      className: "bg-red-50     text-red-700     ring-red-200"      },
};

export default function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, className } = CONFIG[status] ?? CONFIG.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
        className
      )}
    >
      {label}
    </span>
  );
}
