import { useMemo, useState } from "react";
import { Search, Building2, ArrowUpDown, AlertCircle } from "lucide-react";
import { useSuppliers } from "@/hooks/useSuppliers";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function SuppliersPage() {
  const { suppliers, loading, error } = useSuppliers();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      suppliers.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
      ),
    [suppliers, search]
  );

  const totals = useMemo(() => ({
    invoices: suppliers.reduce((sum, s) => sum + s.total_invoices, 0),
    amount:   suppliers.reduce((sum, s) => sum + s.total_amount,   0),
  }), [suppliers]);

  return (
    <div className="space-y-6 max-w-5xl">
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-500" />
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Lieferanten",    value: suppliers.length, color: "text-indigo-600" },
          { label: "Rechnungen",     value: totals.invoices,  color: "text-blue-600"   },
          { label: "Gesamtvolumen",  value: formatCurrency(totals.amount), color: "text-emerald-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl px-5 py-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-sm text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Lieferant suchen…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 rounded-lg border border-slate-200 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
            />
          </div>
          <p className="text-xs text-slate-400 whitespace-nowrap">
            {filtered.length} Lieferanten
          </p>
        </div>

        <div className="overflow-x-auto px-6 pb-4">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">Lade…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Building2 className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">Keine Lieferanten gefunden.</p>
            </div>
          ) : (
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Lieferant", "Rechnungen", "Gesamtbetrag", "Letzte Rechnung"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide"
                    >
                      <span className="inline-flex items-center gap-1">
                        {h}
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-4 w-4 text-indigo-500" />
                        </div>
                        <span className="font-medium text-slate-700">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center justify-center h-6 min-w-[24px] rounded-full bg-slate-100 text-slate-600 text-xs font-semibold px-2">
                        {s.total_invoices}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800">
                      {formatCurrency(s.total_amount)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {formatDate(s.last_invoice_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
