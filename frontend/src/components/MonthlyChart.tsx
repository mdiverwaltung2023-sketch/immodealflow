import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyData } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface Props {
  data: MonthlyData[];
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg ring-1 ring-slate-200 px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-slate-500">
        Volumen:{" "}
        <span className="font-semibold text-slate-800">
          {formatCurrency(payload[0].value)}
        </span>
      </p>
    </div>
  );
}

export default function MonthlyChart({ data }: Props) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-slate-100">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-800">Monatliches Volumen</h2>
        <p className="text-sm text-slate-400 mt-0.5">Rechnungsbetrag der letzten 7 Monate</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#6366f1"
            strokeWidth={2.5}
            fill="url(#grad)"
            dot={false}
            activeDot={{ r: 5, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
