"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { formatPct } from "@/app/(app)/reports/_components/statement";
import type { MonthlyTrendPoint } from "@/lib/reports/types";
import { ChartTooltip } from "./chart-tooltip";
import { usePrefersReducedMotion } from "./use-reduced-motion";

/**
 * Tren Margin 12 bulan (design §5c) — two lines: Margin Bersih is the --yellow
 * bottom-line hero (consistent with ⑤a's yellow Laba line — yellow always marks
 * "the number that matters"), Margin Kotor is a recessive --text-muted DASHED
 * reference. The lines read in grayscale three ways (dash pattern, stroke weight,
 * legend label). `connectNulls={false}` renders a no-revenue month as a GAP,
 * never a misleading 0% line (acceptance #5/#6).
 */

const GROSS_STROKE = "var(--text-muted)";
const NET_STROKE = "var(--yellow)";

const marginTickFormatter = (v: number) => `${v}%`;

export function MarginTrendChart({ data }: { data: MonthlyTrendPoint[] }) {
  const reduced = usePrefersReducedMotion();

  return (
    <Card className="p-4">
      <div>
        <h2 className="font-display text-base font-semibold text-[var(--text)]">
          Tren Margin
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          Margin kotor &amp; bersih per bulan · persen
        </p>
      </div>

      {/* SVG is decorative — the sr-only table below is the accessible source. */}
      <div className="mt-3 h-[240px] sm:h-[280px]" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
              width={40}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickFormatter={marginTickFormatter}
              domain={["auto", "auto"]}
            />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Tooltip
              content={
                <ChartTooltip
                  valueFormatter={(v) => (v == null ? "—" : formatPct(Number(v)))}
                />
              }
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="grossMarginPct"
              name="Margin Kotor"
              stroke={GROSS_STROKE}
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={false}
              connectNulls={false}
              isAnimationActive={!reduced}
              animationDuration={300}
              animationEasing="ease-out"
            />
            <Line
              type="monotone"
              dataKey="netMarginPct"
              name="Margin Bersih"
              stroke={NET_STROKE}
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
              activeDot={{ r: 4, fill: NET_STROKE }}
              isAnimationActive={!reduced}
              animationDuration={300}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Shape-coded legend (grayscale-legible): dashed vs solid line swatches. */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-0 w-3 border-t border-dashed"
            style={{ borderColor: GROSS_STROKE }}
          />
          Margin Kotor
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3 rounded" style={{ background: NET_STROKE }} />
          Margin Bersih
        </span>
      </div>

      <table className="sr-only">
        <caption>Tren margin kotor dan bersih 12 bulan terakhir</caption>
        <thead>
          <tr>
            <th scope="col">Bulan</th>
            <th scope="col">Margin Kotor</th>
            <th scope="col">Margin Bersih</th>
          </tr>
        </thead>
        <tbody>
          {data.map((m) => (
            <tr key={m.month}>
              <th scope="row">{m.label}</th>
              <td>{m.grossMarginPct === null ? "—" : formatPct(m.grossMarginPct)}</td>
              <td>{m.netMarginPct === null ? "—" : formatPct(m.netMarginPct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
