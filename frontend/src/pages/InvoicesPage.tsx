import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, AlertCircle } from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import InvoiceTable from "@/components/InvoiceTable";
import type { InvoiceStatus } from "@/types";

const STATUSES: Array<{ value: InvoiceStatus | ""; label: string }> = [
  { value: "",          label: "Alle Status" },
  { value: "paid",      label: "Bezahlt"     },
  { value: "processed", label: "Verarbeitet" },
  { value: "pending",   label: "Ausstehend"  },
  { value: "error",     label: "Fehler"      },
];

export default function InvoicesPage() {
  const { invoices, loading, error } = useInvoices();

  const [search,  setSearch]  = useState("");
  const [status,  setStatus]  = useState<InvoiceStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.supplier_name.toLowerCase().includes(q);
      const matchStatus = !status || inv.status === status;
      const matchFrom   = !dateFrom || inv.invoice_date >= dateFrom;
      const matchTo     = !dateTo   || inv.invoice_date <= dateTo;
      return matchSearch && matchStatus && matchFrom && matchTo;
    });
  }, [invoices, search, status, dateFrom, dateTo]);

  const statusCounts = useMemo(() => {
    return invoices.reduce<Record<string, number>>((acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      return acc;
    }, {});
  }, [invoices]);

  return (
    <div className="space-y-6 max-w-7xl">
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-500" />
          {error}
        </div>
      )}

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatus(value as InvoiceStatus | "")}
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
              status === value
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
            ].join(" ")}
          >
            {label}
            {value && (
              <span className={`text-[10px] font-bold ${status === value ? "text-indigo-200" : "text-slate-400"}`}>
                {statusCounts[value] ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100">
        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-slate-100">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Suche nach Nummer oder Lieferant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 rounded-lg border border-slate-200 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
            />
          </div>

          {/* Date filters */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
            />
            <span className="text-slate-400 text-sm">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
            />
          </div>

          <p className="ml-auto text-xs text-slate-400 whitespace-nowrap">
            {filtered.length} Einträge
          </p>
        </div>

        {/* Table */}
        <div className="px-6 pb-4">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">Lade Rechnungen…</div>
          ) : (
            <InvoiceTable invoices={filtered} />
          )}
        </div>
      </div>
    </div>
  );
}
