"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { formatRupiah, formatRupiahShort } from "@/lib/utils";
import type { MonthlyTrendPoint } from "@/lib/reports/types";
import { Money } from "@/app/(app)/reports/_components/statement";
import { ChartTooltip } from "./chart-tooltip";
import { usePrefersReducedMotion } from "./use-reduced-motion";

const REVENUE_FILL = "color-mix(in srgb, var(--text) 85%, var(--bg-card))";
const EXPENSE_FILL = "var(--text-muted)";
const PROFIT_STROKE = "var(--yellow)";
const CURSOR_FILL = "color-mix(in srgb, var(--text) 6%, transparent)";

/** Point-level money-token emphasis: a red dot ONLY on a loss month, sitting
 *  below the zero ReferenceLine (position + red co-sign the loss). Positive
 *  months render no dot, keeping the profit line clean. */
function ProfitDot(props: {
  cx?: number;
  cy?: number;
  payload?: MonthlyTrendPoint;
}) {
  const { cx, cy, payload } = props;
  if (payload === undefined || payload.profit >= 0 || cx === undefined || cy === undefined) {
    return null;
  }
  return <circle cx={cx} cy={cy} r={3} fill="var(--money-neg)" />;
}

export function TrendChart({ data }: { data: MonthlyTrendPoint[] }) {
  const reduced = usePrefersReducedMotion();

  return (
    <Card className="p-4">
      <div>
        <h2 className="font-display text-base font-semibold text-[var(--text)]">
          Tren 12 Bulan
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          Pendapatan, beban, dan laba bersih per bulan · nilai Rupiah
        </p>
      </div>

      {/* SVG is decorative — the sr-only table below is the accessible source. */}
      <div className="mt-3 h-[240px] sm:h-[280px]" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickFormatter={formatRupiahShort}
            />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Tooltip
              content={<ChartTooltip valueFormatter={(v) => formatRupiah(Number(v ?? 0))} />}
              cursor={{ fill: CURSOR_FILL }}
            />
            <Bar
              dataKey="revenue"
              name="Pendapatan"
              fill={REVENUE_FILL}
              radius={[2, 2, 0, 0]}
              maxBarSize={22}
              isAnimationActive={!reduced}
              animationDuration={300}
              animationEasing="ease-out"
            />
            <Bar
              dataKey="expense"
              name="Beban"
              fill={EXPENSE_FILL}
              radius={[2, 2, 0, 0]}
              maxBarSize={22}
              isAnimationActive={!reduced}
              animationDuration={300}
              animationEasing="ease-out"
            />
            <Line
              type="monotone"
              dataKey="profit"
              name="Laba"
              stroke={PROFIT_STROKE}
              strokeWidth={2.5}
              dot={<ProfitDot />}
              activeDot={{ r: 4, fill: PROFIT_STROKE }}
              isAnimationActive={!reduced}
              animationDuration={300}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Shape-coded legend (grayscale-legible). */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: REVENUE_FILL }} />
          Pendapatan
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: EXPENSE_FILL }} />
          Beban
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3 rounded" style={{ background: PROFIT_STROKE }} />
          Laba
        </span>
      </div>

      <table className="sr-only">
        <caption>Tren pendapatan, beban, dan laba 12 bulan terakhir</caption>
        <thead>
          <tr>
            <th scope="col">Bulan</th>
            <th scope="col">Pendapatan</th>
            <th scope="col">Beban</th>
            <th scope="col">Laba</th>
          </tr>
        </thead>
        <tbody>
          {data.map((m) => (
            <tr key={m.month}>
              <th scope="row">{m.label}</th>
              <td>
                <Money value={m.revenue} mode="result" />
              </td>
              <td>
                <Money value={m.expense} mode="result" />
              </td>
              <td>
                <Money value={m.profit} mode="result" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
