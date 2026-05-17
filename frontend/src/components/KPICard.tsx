import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: number;
  trendLabel?: string;
}

export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-indigo-600",
  iconBg    = "bg-indigo-50",
  trend,
  trendLabel,
}: KPICardProps) {
  const trendUp = trend !== undefined && trend >= 0;

  return (
    <div className="relative bg-white rounded-2xl p-6 shadow-sm ring-1 ring-slate-100 overflow-hidden">
      {/* Subtle gradient decoration */}
      <div
        className="absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-[0.07]"
        style={{ background: "radial-gradient(circle, #6366f1, transparent)" }}
      />

      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1.5 text-3xl font-bold text-slate-800 tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>

      {trend !== undefined && (
        <div className="mt-4 flex items-center gap-1.5">
          {trendUp ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
          )}
          <span
            className={cn(
              "text-xs font-semibold",
              trendUp ? "text-emerald-600" : "text-red-500"
            )}
          >
            {trendUp ? "+" : ""}
            {trend}%
          </span>
          {trendLabel && (
            <span className="text-xs text-slate-400">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
