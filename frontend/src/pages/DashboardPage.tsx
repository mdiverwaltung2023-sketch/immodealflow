import { useMemo } from "react";
import {
  FileText,
  CalendarDays,
  TrendingUp,
  Building2,
  AlertCircle,
} from "lucide-react";
import KPICard from "@/components/KPICard";
import MonthlyChart from "@/components/MonthlyChart";
import SupplierChart from "@/components/SupplierChart";
import InvoiceTable from "@/components/InvoiceTable";
import { useInvoices } from "@/hooks/useInvoices";
import { useSuppliers } from "@/hooks/useSuppliers";
import { MOCK_MONTHLY_DATA, MOCK_SUPPLIER_CHART } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const { invoices, loading: invLoading, error } = useInvoices();
  const { suppliers } = useSuppliers();

  const kpi = useMemo(() => {
    const now         = new Date();
    const thisMonth   = invoices.filter((inv) => {
      const d = new Date(inv.invoice_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalAmount = invoices.reduce((s, inv) => s + inv.gross_amount, 0);
    return {
      total:      invoices.length,
      thisMonth:  thisMonth.length,
      amount:     totalAmount,
      suppliers:  suppliers.length,
    };
  }, [invoices, suppliers]);

  const recent = useMemo(
    () => [...invoices].sort((a, b) => b.id - a.id).slice(0, 5),
    [invoices]
  );

  return (
    <div className="space-y-8 max-w-7xl">

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-500" />
          {error}
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KPICard
          title="Rechnungen gesamt"
          value={invLoading ? "…" : kpi.total}
          icon={FileText}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
          trend={8}
          trendLabel="vs. Vormonat"
        />
        <KPICard
          title="Rechnungen diesen Monat"
          value={invLoading ? "…" : kpi.thisMonth}
          icon={CalendarDays}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          trend={12}
          trendLabel="vs. Vormonat"
        />
        <KPICard
          title="Gesamtbetrag"
          value={invLoading ? "…" : formatCurrency(kpi.amount)}
          subtitle="Brutto, alle Rechnungen"
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          trend={5}
          trendLabel="vs. Vormonat"
        />
        <KPICard
          title="Lieferanten"
          value={invLoading ? "…" : kpi.suppliers}
          icon={Building2}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          trend={2}
          trendLabel="neu diesen Monat"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <MonthlyChart data={MOCK_MONTHLY_DATA} />
        <SupplierChart data={MOCK_SUPPLIER_CHART} />
      </div>

      {/* Recent invoices */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Letzte Rechnungen</h2>
            <p className="text-sm text-slate-400 mt-0.5">Die 5 neuesten Einträge</p>
          </div>
          <a
            href="/invoices"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Alle anzeigen →
          </a>
        </div>
        <div className="px-6 pb-4">
          {invLoading ? (
            <div className="py-12 text-center text-sm text-slate-400">Lade…</div>
          ) : (
            <InvoiceTable invoices={recent} compact />
          )}
        </div>
      </div>
    </div>
  );
}
