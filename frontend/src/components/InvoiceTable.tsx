import { FileText, ArrowUpDown } from "lucide-react";
import type { Invoice } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import StatusBadge from "./StatusBadge";

interface Props {
  invoices: Invoice[];
  compact?: boolean;
}

export default function InvoiceTable({ invoices, compact = false }: Props) {
  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <FileText className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">Keine Rechnungen gefunden.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {["Rechnungsnr.", "Lieferant", "Betrag", "Datum", "Status"].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap"
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
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              className="group hover:bg-slate-50/80 transition-colors"
            >
              <td className="px-4 py-3.5">
                <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  {inv.invoice_number}
                </span>
              </td>
              <td className="px-4 py-3.5">
                <span className="font-medium text-slate-700">{inv.supplier_name}</span>
              </td>
              <td className="px-4 py-3.5">
                <span className="font-semibold text-slate-800">
                  {formatCurrency(inv.gross_amount, inv.currency)}
                </span>
                {!compact && (
                  <span className="ml-1.5 text-xs text-slate-400">
                    (netto {formatCurrency(inv.net_amount)})
                  </span>
                )}
              </td>
              <td className="px-4 py-3.5 text-slate-500">
                {formatDate(inv.invoice_date)}
              </td>
              <td className="px-4 py-3.5">
                <StatusBadge status={inv.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
