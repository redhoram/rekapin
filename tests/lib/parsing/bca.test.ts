import { describe, expect, it } from "vitest";
import { readFile } from "@/lib/parsing/read-file";
import { detectPreset } from "@/lib/parsing/presets/registry";
import { runPipeline } from "@/lib/parsing/pipeline";
import { readFixture } from "../../helpers/fixtures";

const BIZ = "biz-1";
const ACC = "acc-1";

describe("BCA preset", () => {
  it("auto-detects a BCA export by its headers", () => {
    const { headers } = readFile("bca-sample.csv", readFixture("bca-sample.csv"));
    const preset = detectPreset(headers);
    expect(preset?.code).toBe("BCA");
  });

  it("does not misdetect an unrelated file as BCA", () => {
    const preset = detectPreset(["Date", "Memo", "Value"]);
    expect(preset).toBeNull();
  });

  it("resolves the DB/CR mapping in amount_direction mode", () => {
    const { headers } = readFile("bca-sample.csv", readFixture("bca-sample.csv"));
    const mapping = detectPreset(headers)!.resolveMapping(headers);
    expect(mapping.amountMode).toBe("amount_direction");
    expect(mapping.dateColumn).toBe("Tanggal Transaksi");
    expect(mapping.descriptionColumn).toBe("Keterangan");
    expect(mapping.amountColumn).toBe("Jumlah");
    expect(mapping.directionColumn).toBe("DB/CR");
    expect(mapping.dateFormat).toBe("dd/MM/yyyy");
  });

  it("produces correct totals + date range for the fixture (acceptance #5)", () => {
    const { headers, rows } = readFile("bca-sample.csv", readFixture("bca-sample.csv"));
    const mapping = detectPreset(headers)!.resolveMapping(headers);
    const result = runPipeline({
      rawRows: rows,
      mapping,
      businessId: BIZ,
      bankAccountId: ACC,
      existingHashes: new Set(),
    });

    expect(result.rowCount).toBe(5);
    expect(result.validCount).toBe(5);
    expect(result.duplicateCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(result.totalIn).toBe(700000 + 2000000 + 1250000);
    expect(result.totalOut).toBe(15000 + 500000);
    expect(result.dateRange).toEqual({ min: "2026-07-01", max: "2026-07-10" });
  });
});
