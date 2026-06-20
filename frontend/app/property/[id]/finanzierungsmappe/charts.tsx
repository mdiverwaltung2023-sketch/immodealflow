// Finanzierungsmappe v2 — Inline-SVG-Grafiken (druck-/PDF-fest, keine Libs).
// Reine Präsentationskomponenten (Server-Components, kein State).

const C = {
  emerald: "#059669",
  emeraldL: "#a7f3d0",
  amber: "#f59e0b",
  amberL: "#fde68a",
  rose: "#e11d48",
  roseL: "#fecdd3",
  teal: "#0d9488",
  indigo: "#6366f1",
  zinc200: "#e4e4e7",
  zinc300: "#d4d4d8",
  zinc400: "#a1a1aa",
  zinc500: "#71717a",
  zinc700: "#3f3f46",
  zinc900: "#18181b"
};

export function lightColor(score: number): string {
  if (score >= 70) return C.emerald;
  if (score >= 55) return C.amber;
  return C.rose;
}

function fmtEur(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(Math.round(n));
}

// --- Score-Donut (0..100) -------------------------------------------
export function ScoreDonut({
  score,
  caption,
  size = 132
}: {
  score: number;
  caption: string;
  size?: number;
}) {
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, score / 100));
  const col = lightColor(score);
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.zinc200} strokeWidth={12} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={`${circ * frac} ${circ}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize={26} fontWeight={700} fill={C.zinc900}>
          {Math.round(score)}
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" fontSize={11} fill={C.zinc400}>
          / 100
        </text>
      </svg>
      <div className="mt-1 text-center text-xs font-medium text-zinc-600">{caption}</div>
    </div>
  );
}

// --- Horizontale Balken ---------------------------------------------
export type HBarItem = { label: string; value: number; max: number; color?: string; valueLabel: string };

export function HBars({ items, height = 18 }: { items: HBarItem[]; height?: number }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => {
        const frac = it.max > 0 ? Math.max(0, Math.min(1, it.value / it.max)) : 0;
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-40 shrink-0 text-xs text-zinc-600">{it.label}</div>
            <div className="relative flex-1">
              <div className="h-[18px] w-full rounded bg-zinc-100" style={{ height }} />
              <div
                className="absolute left-0 top-0 rounded"
                style={{
                  height,
                  width: `${frac * 100}%`,
                  background: it.color ?? C.teal
                }}
              />
            </div>
            <div className="w-28 shrink-0 text-right text-xs font-semibold text-zinc-900">
              {it.valueLabel}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Markt-Positionsbalken (Wert innerhalb einer Spanne) ------------
export function RangeBar({
  low,
  high,
  value,
  unit,
  width = 460
}: {
  low: number;
  high: number;
  value: number;
  unit: string;
  width?: number;
}) {
  const h = 46;
  const pad = 10;
  const min = Math.min(low, value) * 0.96;
  const max = Math.max(high, value) * 1.04;
  const span = max - min || 1;
  const x = (v: number) => pad + ((v - min) / span) * (width - 2 * pad);
  const col = value < low ? C.emerald : value > high ? C.rose : C.amber;
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
      <line x1={pad} y1={26} x2={width - pad} y2={26} stroke={C.zinc200} strokeWidth={2} />
      <rect x={x(low)} y={20} width={Math.max(2, x(high) - x(low))} height={12} rx={3} fill={C.emeraldL} />
      <text x={x(low)} y={14} fontSize={10} fill={C.zinc500} textAnchor="middle">
        {Math.round(low)}
      </text>
      <text x={x(high)} y={14} fontSize={10} fill={C.zinc500} textAnchor="middle">
        {Math.round(high)}
      </text>
      <circle cx={x(value)} cy={26} r={6} fill={col} stroke="#fff" strokeWidth={2} />
      <text x={x(value)} y={44} fontSize={11} fontWeight={700} fill={col} textAnchor="middle">
        {Math.round(value)} {unit}
      </text>
    </svg>
  );
}

// --- Flächen-/Linien-Chart über Jahre -------------------------------
export type Series = { points: number[]; color: string; fill?: string; label: string };

export function AreaChart({
  series,
  xLabels,
  width = 520,
  height = 200,
  yFormat = (v: number) => fmtEur(v)
}: {
  series: Series[];
  xLabels: string[];
  width?: number;
  height?: number;
  yFormat?: (v: number) => string;
}) {
  const padL = 64;
  const padR = 12;
  const padT = 12;
  const padB = 26;
  const n = xLabels.length;
  const allY = series.flatMap((s) => s.points);
  const yMax = Math.max(1, ...allY);
  const px = (i: number) => padL + (i / Math.max(1, n - 1)) * (width - padL - padR);
  const py = (v: number) => padT + (1 - v / yMax) * (height - padT - padB);

  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => yMax * f);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {gridVals.map((gv, i) => (
        <g key={i}>
          <line x1={padL} y1={py(gv)} x2={width - padR} y2={py(gv)} stroke={C.zinc200} strokeWidth={1} />
          <text x={padL - 6} y={py(gv) + 3} fontSize={9} fill={C.zinc400} textAnchor="end">
            {yFormat(gv)}
          </text>
        </g>
      ))}
      {series.map((s, si) => {
        const line = s.points.map((v, i) => `${i === 0 ? "M" : "L"} ${px(i)} ${py(v)}`).join(" ");
        const area = `${line} L ${px(n - 1)} ${py(0)} L ${px(0)} ${py(0)} Z`;
        return (
          <g key={si}>
            {s.fill ? <path d={area} fill={s.fill} opacity={0.5} /> : null}
            <path d={line} fill="none" stroke={s.color} strokeWidth={2.4} />
          </g>
        );
      })}
      {xLabels.map((lab, i) =>
        i % Math.ceil(n / 8) === 0 || i === n - 1 ? (
          <text key={i} x={px(i)} y={height - 8} fontSize={9} fill={C.zinc400} textAnchor="middle">
            {lab}
          </text>
        ) : null
      )}
    </svg>
  );
}

// --- Vertikale Balken mit Referenzlinien (Stresstest) ---------------
export function StressBars({
  items,
  refLines,
  yMax,
  width = 520,
  height = 200
}: {
  items: { label: string; value: number; color: string }[];
  refLines: { y: number; label: string; color: string }[];
  yMax: number;
  width?: number;
  height?: number;
}) {
  const padL = 40;
  const padR = 12;
  const padT = 12;
  const padB = 34;
  const n = items.length;
  const bw = ((width - padL - padR) / n) * 0.6;
  const slot = (width - padL - padR) / n;
  const py = (v: number) => padT + (1 - Math.max(0, Math.min(v, yMax)) / yMax) * (height - padT - padB);
  const x = (i: number) => padL + slot * i + (slot - bw) / 2;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <line x1={padL} y1={py(0)} x2={width - padR} y2={py(0)} stroke={C.zinc300} strokeWidth={1} />
      {refLines.map((rl, i) => (
        <g key={i}>
          <line
            x1={padL}
            y1={py(rl.y)}
            x2={width - padR}
            y2={py(rl.y)}
            stroke={rl.color}
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <text x={width - padR} y={py(rl.y) - 3} fontSize={9} fill={rl.color} textAnchor="end">
            {rl.label}
          </text>
        </g>
      ))}
      {items.map((it, i) => (
        <g key={i}>
          <rect x={x(i)} y={py(it.value)} width={bw} height={py(0) - py(it.value)} rx={3} fill={it.color} />
          <text x={x(i) + bw / 2} y={py(it.value) - 4} fontSize={10} fontWeight={700} fill={C.zinc700} textAnchor="middle">
            {it.value.toFixed(2).replace(".", ",")}
          </text>
          <text x={x(i) + bw / 2} y={height - 18} fontSize={9} fill={C.zinc500} textAnchor="middle">
            {it.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// --- Kleine Ampel ---------------------------------------------------
export function MiniAmpel({ light }: { light: "GREEN" | "YELLOW" | "RED" }) {
  const map = { GREEN: C.emerald, YELLOW: C.amber, RED: C.rose };
  const order: ("RED" | "YELLOW" | "GREEN")[] = ["RED", "YELLOW", "GREEN"];
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-1.5 py-1">
      {order.map((l) => (
        <span
          key={l}
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: l === light ? map[l] : C.zinc200 }}
        />
      ))}
    </span>
  );
}
