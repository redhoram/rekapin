// Shared enums/lists for onboarding + membership. UI labels are Bahasa Indonesia;
// stored values (the `value` fields) are stable English/code identifiers.

/** Membership roles. Mirrors the `role` pgEnum in the schema. */
export const ROLES = ["admin", "staff"] as const;
export type Role = (typeof ROLES)[number];

/**
 * Business types offered in the onboarding "Jenis usaha" dropdown.
 * Binding list from spec DECISIONS #2.
 */
export const BUSINESS_TYPES = [
  { value: "perdagangan", label: "Perdagangan / Retail" },
  { value: "kuliner", label: "Kuliner / F&B" },
  { value: "jasa", label: "Jasa" },
  { value: "manufaktur", label: "Manufaktur / Produksi" },
  { value: "digital", label: "Digital / Online" },
  { value: "lainnya", label: "Lainnya" },
] as const;

export const BUSINESS_TYPE_VALUES = BUSINESS_TYPES.map((t) => t.value) as [
  string,
  ...string[],
];

/**
 * Bank presets for the bank-account form. Binding list from spec DECISIONS #3.
 * When "Lainnya", the free-text label field carries the actual bank name.
 */
export const BANKS = [
  { value: "BCA", label: "BCA" },
  { value: "Mandiri", label: "Mandiri" },
  { value: "BRI", label: "BRI" },
  { value: "BNI", label: "BNI" },
  { value: "Lainnya", label: "Lainnya" },
] as const;

export const BANK_VALUES = BANKS.map((b) => b.value) as [string, ...string[]];

/** localStorage key for the persisted theme (matches CLAUDE.md). */
export const THEME_STORAGE_KEY = "rekapin_theme";

/** Max upload size — 10 MB (spec). Enforced client-side AND server-side. */
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

/** Accepted upload extensions (lowercase, with dot). Validated both sides. */
export const ACCEPTED_UPLOAD_EXTENSIONS = [".csv", ".xlsx", ".xls"] as const;

/** `accept` attribute value for the dropzone file input. */
export const UPLOAD_ACCEPT_ATTR = ACCEPTED_UPLOAD_EXTENSIONS.join(",");
