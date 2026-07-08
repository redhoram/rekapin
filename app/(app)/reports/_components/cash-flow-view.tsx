"use client";

import * as React from "react";
import { ArrowDownLeft, ArrowUpRight, Info, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { formatDateShort } from "@/lib/utils";
import type { CashFlowAccountSection, CashFlowReport } from "@/lib/reports/types";
import { ComparisonDelta } from "./comparison-delta";
import {
  LineRow,
  Money,
  ReportStat,
  ResultRow,
  SectionHeaderRow,
} from "./statement";
import type { ReportAccountOption } from "./types";

type CfView = "per-account" | "combined";

const VIEW_OPTIONS: { value: CfView; label: string }[] = [
  { value: "per-account", label: "Per Rekening" },
  { value: "combined", label: "Gabungan" },
];

/**
 * Arus Kas (design §5): combined KPI strip + per-account/combined statements.
 * The view toggle is client-only state (the whole report ships in one fetch —
 * no refetch needed; promote to ?cfView= only if deep-linking is wanted later).
 */
export function CashFlowView({
  report,
  accounts,
}: {
  report: CashFlowReport;
  accounts: ReportAccountOption[];
}) {
  const [view, setView] = React.useState<CfView>("per-account");
  const openingDateById = new Map(accounts.map((a) => [a.id, a.openingDate]));

  return (
    <div className="flex flex-col gap-6">
      {/* Combined KPI strip. Total Keluar's delta is INVERSE — rising cash-out
          is not "good" (design §5.1). Saldo Akhir is the emphasis card. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ReportStat
          label="Saldo Awal"
          value={<Money value={report.combined.openingBalance.current} mode="result" />}
          sub={<ComparisonDelta delta={report.combined.openingBalance} withSuffix />}
        />
        <ReportStat
          label="Total Masuk"
          value={<Money value={report.combined.totalIn.current} mode="result" />}
          sub={<ComparisonDelta delta={report.combined.totalIn} withSuffix />}
        />
        <ReportStat
          label="Total Keluar"
          value={<Money value={report.combined.totalOut.current} mode="cost" />}
          sub={
            <ComparisonDelta
              delta={report.combined.totalOut}
              polarity="inverse"
              withSuffix
            />
          }
        />
        <ReportStat
          label="Saldo Akhir"
          value={<Money value={report.combined.closingBalance.current} mode="result" />}
          sub={<ComparisonDelta delta={report.combined.closingBalance} withSuffix />}
        />
      </div>

      <Segmented
        options={VIEW_OPTIONS}
        value={view}
        onChange={setView}
        ariaLabel="Tampilan arus kas"
        className="self-start"
      />

      {view === "per-account" ? (
        <div className="flex flex-col gap-4">
          {report.accounts.map((section) => (
            <AccountStatement
              key={section.accountId}
              section={section}
              openingDate={openingDateById.get(section.accountId)}
            />
          ))}
        </div>
      ) : (
        <AccountStatement section={report.combined} />
      )}
    </div>
  );
}

function AccountStatement({
  section,
  openingDate,
}: {
  section: CashFlowAccountSection;
  openingDate?: string;
}) {
  return (
    <Card className="p-4">
      {/* Card header: account label + closing balance at a glance */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-[var(--text)]">
          {section.accountLabel}
        </h3>
        <p className="inline-flex items-center gap-2 text-sm">
          <ComparisonDelta delta={section.closingBalance} />
          <Money
            value={section.closingBalance.current}
            mode="result"
            className="font-display font-bold"
          />
        </p>
      </div>

      {section.note === "opened_mid_period" && openingDate && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Info size={14} strokeWidth={1.75} aria-hidden="true" />
          Rekening mulai dicatat sejak {formatDateShort(openingDate)}.
        </p>
      )}

      <table className="mt-3 w-full text-sm">
        <caption className="sr-only">
          Arus kas {section.accountLabel}
        </caption>
        <tbody>
          <ResultRow
            label="Saldo Awal"
            hasPercentColumn={false}
            amount={
              <Money
                value={section.openingBalance.current}
                mode="result"
                className="font-display text-base font-bold"
              />
            }
            delta={<ComparisonDelta delta={section.openingBalance} />}
          />

          <SectionHeaderRow
            icon={ArrowDownLeft}
            label="Kas Masuk"
            hasPercentColumn={false}
            amount={<span />}
          />
          {section.cashInLines.map((line) => (
            <LineRow
              key={line.categoryId ?? "uncategorized"}
              label={line.categoryName}
              hasPercentColumn={false}
              amount={<Money value={line.total} mode="result" />}
            />
          ))}
          <ResultRow
            label="Total Masuk"
            hasPercentColumn={false}
            amount={
              <Money
                value={section.totalIn.current}
                mode="result"
                className="font-display text-base font-bold"
              />
            }
            delta={<ComparisonDelta delta={section.totalIn} />}
          />

          <SectionHeaderRow
            icon={ArrowUpRight}
            label="Kas Keluar"
            hasPercentColumn={false}
            amount={<span />}
          />
          {section.cashOutLines.map((line) => (
            <LineRow
              key={line.categoryId ?? "uncategorized"}
              label={line.categoryName}
              hasPercentColumn={false}
              amount={<Money value={line.total} mode="cost" />}
            />
          ))}
          <ResultRow
            label="Total Keluar"
            hasPercentColumn={false}
            amount={
              <Money
                value={section.totalOut.current}
                mode="cost"
                className="font-display text-base font-bold"
              />
            }
            delta={<ComparisonDelta delta={section.totalOut} polarity="inverse" />}
          />

          <ResultRow
            label="Saldo Akhir"
            hero
            hasPercentColumn={false}
            amount={
              <Money
                value={section.closingBalance.current}
                mode="result"
                className="font-display text-lg font-bold"
              />
            }
            delta={<ComparisonDelta delta={section.closingBalance} />}
          />
        </tbody>
      </table>

      {section.cashInLines.length === 0 && section.cashOutLines.length === 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Wallet size={14} strokeWidth={1.75} aria-hidden="true" />
          Tidak ada pergerakan kas di periode ini.
        </p>
      )}
    </Card>
  );
}
