import { describe, expect, it } from "vitest";
import { readCsv, readFile } from "@/lib/parsing/read-file";
import { readFixture } from "../../helpers/fixtures";

describe("readCsv", () => {
  it("parses headers + rows and skips empty lines", () => {
    const buffer = Buffer.from(
      "Tanggal,Deskripsi,Jumlah\n01/07/2026,Penjualan,100000\n\n02/07/2026,Beli,50000\n",
      "utf-8",
    );
    const { headers, rows } = readCsv(buffer);
    expect(headers).toEqual(["Tanggal", "Deskripsi", "Jumlah"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      Tanggal: "01/07/2026",
      Deskripsi: "Penjualan",
      Jumlah: "100000",
    });
  });

  it("falls back to latin1 when UTF-8 decoding is garbled", () => {
    const buffer = Buffer.concat([
      Buffer.from("Tanggal,Deskripsi\n01/07/2026,Caf", "utf-8"),
      Buffer.from([0xe9]), // 'é' in latin1, invalid as a lone UTF-8 byte
      Buffer.from("\n", "utf-8"),
    ]);
    const { rows, encodingWarning } = readCsv(buffer);
    expect(rows[0]["Deskripsi"]).toContain("é");
    expect(encodingWarning).toBe(false);
  });

  it("reads the BCA fixture via extension dispatch", () => {
    const { headers, rows } = readFile("bca-sample.csv", readFixture("bca-sample.csv"));
    expect(headers).toContain("DB/CR");
    expect(rows).toHaveLength(5);
  });
});
