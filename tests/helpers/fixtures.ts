import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Read a file from tests/fixtures as a Buffer. */
export function readFixture(name: string): Buffer {
  return readFileSync(fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url)));
}
