import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { SupplierChartData } from "@/types";
import { formatCurrency, truncate } from "@/lib/utils";

interface Props {
  data: SupplierChartData[];
}

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg ring-1 ring-slate-200 px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{payload[0].name}</p>
      <p className="text-slate-500">
        Gesamt:{" "}
        <span className="font-semibold text-slate-800">
          {formatCurrency(payload[0].value)}
        </span>
      </p>
    </div>
  );
}

export default function SupplierChart({ data }: Props) {
  const sorted = [...data].sort((a, b) => b.amount - a.amount).slice(0, 5);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-slate-100">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-800">Top Lieferanten</h2>
        <p className="text-sm text-slate-400 mt-0.5">Nach Gesamtbetrag (EUR)</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          layout="vertical"
          data={sorted}
          margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
          barSize={16}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={90}
            tickFormatter={(v: string) => truncate(v, 12)}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
          <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
            {sorted.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
