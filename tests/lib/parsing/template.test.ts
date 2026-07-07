import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { readXlsx } from "@/lib/parsing/read-file";
import {
  generateTemplateBuffer,
  matchesTemplateHeaders,
  templateMapping,
} from "@/lib/parsing/template";
import { normalizeRows } from "@/lib/parsing/normalize";

describe("Rekapin template", () => {
  it("generates a workbook with the exact header row + one example row", () => {
    const { headers, rows } = readXlsx(generateTemplateBuffer());
    expect(headers).toEqual(["Tanggal", "Deskripsi", "Jumlah", "Arah"]);
    expect(rows).toHaveLength(1);
    expect(rows[0]["Deskripsi"]).toMatch(/^Contoh:/);
  });

  it("detects and maps the template shape (not a bank preset)", () => {
    const headers = ["Tanggal", "Deskripsi", "Jumlah", "Arah"];
    expect(matchesTemplateHeaders(headers)).toBe(true);
    const mapping = templateMapping(headers);
    expect(mapping.amountMode).toBe("amount_direction");
    expect(mapping.directionColumn).toBe("Arah");
    expect(mapping.dateFormat).toBe("dd/MM/yyyy");
  });

  it("skips the 'Contoh:' example row and parses real rows (Masuk/Keluar)", () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Tanggal", "Deskripsi", "Jumlah", "Arah"],
      ["01/07/2026", "Contoh: jangan diisi", 700000, "Masuk"],
      ["02/07/2026", "Penjualan toko", 150000, "Masuk"],
      ["03/07/2026", "Beli bahan baku", 50000, "Keluar"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Mutasi");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const { headers, rows } = readXlsx(buffer);
    const { normalized, failed, skippedExampleCount } = normalizeRows(
      rows,
      templateMapping(headers),
    );
    expect(skippedExampleCount).toBe(1);
    expect(failed).toHaveLength(0);
    expect(normalized).toHaveLength(2);
    expect(normalized[0]).toMatchObject({ amount: 150000, direction: "in" });
    expect(normalized[1]).toMatchObject({ amount: 50000, direction: "out" });
  });

  it("template example row alone yields zero normalized rows", () => {
    const { headers, rows } = readXlsx(generateTemplateBuffer());
    const { normalized, skippedExampleCount } = normalizeRows(
      rows,
      templateMapping(headers),
    );
    expect(normalized).toHaveLength(0);
    expect(skippedExampleCount).toBe(1);
  });
});
