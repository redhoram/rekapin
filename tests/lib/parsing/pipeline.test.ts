import { describe, expect, it } from "vitest";
import { readFile } from "@/lib/parsing/read-file";
import { detectPreset } from "@/lib/parsing/presets/registry";
import { runPipeline } from "@/lib/parsing/pipeline";
import { readFixture } from "../../helpers/fixtures";

const BIZ = "biz-1";
const ACC = "acc-1";

function pipelineFor(fixture: string, existingHashes = new Set<string>()) {
  const { headers, rows } = readFile(fixture, readFixture(fixture));
  const mapping = detectPreset(headers)!.resolveMapping(headers);
  return runPipeline({
    rawRows: rows,
    mapping,
    businessId: BIZ,
    bankAccountId: ACC,
    existingHashes,
  });
}

describe("pipeline dedup + failures", () => {
  it("flags in-file duplicates", () => {
    const result = pipelineFor("bca-sample-with-dupes.csv");
    expect(result.rowCount).toBe(7);
    expect(result.validCount).toBe(5);
    expect(result.duplicateCount).toBe(2);
    expect(result.failedCount).toBe(0);
  });

  it("re-uploading the same file marks 100% duplicate (acceptance #3)", () => {
    const first = pipelineFor("bca-sample.csv");
    const existing = new Set(first.insertableRows.map((r) => r.dedupHash));
    const second = pipelineFor("bca-sample.csv", existing);
    expect(second.validCount).toBe(0);
    expect(second.duplicateCount).toBe(5);
    expect(second.insertableRows).toHaveLength(0);
    expect(second.previewRows.every((r) => r.status === "duplicate")).toBe(true);
  });

  it("reports failed rows with specific reasons (acceptance #4)", () => {
    const result = pipelineFor("bca-sample-with-errors.csv");
    expect(result.validCount).toBe(2);
    expect(result.failedCount).toBe(4);
    expect(result.totalIn).toBe(100000 + 250000);
    expect(result.totalOut).toBe(0);

    const reasons = result.previewRows
      .filter((r) => r.status === "failed")
      .map((r) => r.reason ?? "");
    expect(reasons.some((r) => r.includes("format"))).toBe(true); // bad date
    expect(reasons.some((r) => r.includes("kosong"))).toBe(true); // empty amount
    expect(reasons.some((r) => r.includes("sen"))).toBe(true); // cents
    expect(reasons.some((r) => r.includes("lebih besar dari nol"))).toBe(true); // zero
  });

  it("prioritizes problem rows first in the capped preview", () => {
    const result = pipelineFor("bca-sample-with-errors.csv");
    const firstFour = result.previewRows.slice(0, 4).map((r) => r.status);
    expect(firstFour.every((s) => s === "failed")).toBe(true);
  });
});
