"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatPct, Money } from "@/app/(app)/reports/_components/statement";
import { formatRupiah, formatRupiahShort } from "@/lib/utils";
import type { ExpenseComposition, ExpenseCompositionSlice } from "@/lib/reports/types";
import { ChartTooltip } from "./chart-tooltip";
import { usePrefersReducedMotion } from "./use-reduced-motion";

/**
 * Komposisi Beban (design §5b) — a RANKED HORIZONTAL bar chart (decision #3,
 * donut overridden): rank = length + order, ZERO qualitative palette. The
 * largest cost is a --text luminance step (not a hue), every other real category
 * is --text-muted, and the "Lainnya" roll-up is a dimmer color-mix. Colorblind-
 * safe by construction (length + order + inline labels), and its horizontal
 * orientation is a distinct visual object from the vertical time-series in ⑤a.
 */

const LARGEST_FILL = "var(--text)";
const CATEGORY_FILL = "var(--text-muted)";
const LAINNYA_FILL = "color-mix(in srgb, var(--text-muted) 55%, var(--bg-card))";
const CURSOR_FILL = "color-mix(in srgb, var(--text) 6%, transparent)";

/** Clip a long category name to 14 chars + ellipsis (design §5b). */
function truncate14(value: string): string {
  return value.length > 14 ? `${value.slice(0, 14)}…` : value;
}

export function ExpenseCompositionChart({
  composition,
}: {
  composition: ExpenseComposition;
}) {
  const reduced = usePrefersReducedMotion();
  const slices = composition.slices;
  const isEmpty = slices.length === 0;

  // Bar-end label: compact Rupiah + "· pct%" printed at the bar's right edge, so
  // every value is legible WITHOUT hovering (design §4.3). Closes over `slices`
  // to look up percentOfTotal by the label's data index.
  const renderBarEndLabel = (props: {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    index?: number;
  }) => {
    const { x, y, width, height, index } = props;
    if (
      index === undefined ||
      x === undefined ||
      y === undefined ||
      width === undefined ||
      height === undefined
    ) {
      return null;
    }
    const slice = slices[index];
    if (!slice) return null;
    const labelX = Number(x) + Number(width) + 6;
    const labelY = Number(y) + Number(height) / 2;
    const label =
      slice.percentOfTotal === null
        ? formatRupiahShort(slice.total)
        : `${formatRupiahShort(slice.total)} · ${formatPct(slice.percentOfTotal)}`;
    return (
      <text
        x={labelX}
        y={labelY}
        fill="var(--text)"
        fontSize={11}
        dominantBaseline="central"
        className="tabular-nums"
      >
        {label}
      </text>
    );
  };

  return (
    <Card className="p-4">
      <div>
        <h2 className="font-display text-base font-semibold text-[var(--text)]">
          Komposisi Beban
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          Beban terbesar di {composition.period.label}
        </p>
      </div>

      {isEmpty ? (
        <div className="mt-3 flex h-[240px] flex-col items-center justify-center gap-2 text-center sm:h-[280px]">
          <Receipt
            size={20}
            strokeWidth={1.75}
            className="text-[var(--text-muted)]"
            aria-hidden="true"
          />
          <p className="text-sm text-[var(--text-muted)]">
            Belum ada beban tercatat di periode ini.
          </p>
        </div>
      ) : (
        <>
          {/* SVG is decorative — the sr-only table below is the accessible source. */}
          <div className="mt-3 h-[240px] sm:h-[280px]" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={slices}
                margin={{ right: 88, left: 0, top: 4, bottom: 4 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="categoryName"
                  width={112}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  tickFormatter={truncate14}
                />
                <Tooltip
                  content={
                    <ChartTooltip valueFormatter={(v) => formatRupiah(Number(v ?? 0))} />
                  }
                  cursor={{ fill: CURSOR_FILL }}
                />
                <Bar
                  dataKey="total"
                  name="Jumlah"
                  radius={[0, 3, 3, 0]}
                  maxBarSize={26}
                  isAnimationActive={!reduced}
                  animationDuration={300}
                  animationEasing="ease-out"
                >
                  {slices.map((slice: ExpenseCompositionSlice, i) => (
                    <Cell
                      key={slice.categoryId ?? "lainnya"}
                      fill={
                        slice.categoryId === null
                          ? LAINNYA_FILL
                          : i === 0
                            ? LARGEST_FILL
                            : CATEGORY_FILL
                      }
                    />
                  ))}
                  <LabelList dataKey="total" content={renderBarEndLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <table className="sr-only">
            <caption>Komposisi beban {composition.period.label}</caption>
            <thead>
              <tr>
                <th scope="col">Kategori</th>
                <th scope="col">Jumlah</th>
                <th scope="col">Persentase</th>
              </tr>
            </thead>
            <tbody>
              {slices.map((slice) => (
                <tr key={slice.categoryId ?? "lainnya"}>
                  <th scope="row">{slice.categoryName}</th>
                  <td>
                    <Money value={slice.total} mode="result" />
                  </td>
                  <td>
                    {slice.percentOfTotal === null ? "—" : formatPct(slice.percentOfTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Card>
  );
}
