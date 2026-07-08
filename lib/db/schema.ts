import {
  pgTable,
  pgEnum,
  text,
  boolean,
  integer,
  timestamp,
  date,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";
import type { ColumnMapping, MappingSource } from "@/lib/parsing/types";

// ---------------------------------------------------------------------------
// Better Auth core tables
// Field names match the Better Auth Drizzle adapter contract (user/session/
// account/verification). Do not rename columns — the adapter relies on them.
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// ---------------------------------------------------------------------------
// App tables
// ---------------------------------------------------------------------------

/** Membership role — matches the ROLES constant in lib/constants.ts. */
export const roleEnum = pgEnum("role", ["admin", "staff"]);

export const businesses = pgTable("businesses", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  businessType: text("business_type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const businessMembers = pgTable(
  "business_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    invitedBy: text("invited_by").references(() => user.id),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [
    unique("business_members_business_user_unique").on(t.businessId, t.userId),
    // Session -> memberships lookups filter by user_id.
    index("business_members_user_id_idx").on(t.userId),
  ],
);

// NOTE: table created for schema completeness (FR-1.4 data model). No UI or
// server action reads/writes it in this step — the invite/accept/revoke flow
// is a later step (spec DECISIONS #1).
export const invitations = pgTable(
  "invitations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: roleEnum("role").notNull(),
    token: text("token").notNull().unique(),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => user.id),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("invitations_business_id_idx").on(t.businessId)],
);

export const bankAccounts = pgTable(
  "bank_accounts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    bankCode: text("bank_code").notNull(),
    label: text("label").notNull(),
    // Last 4 digits, stored as text e.g. "1234".
    accountMask: text("account_mask").notNull(),
    // Integer Rupiah — never numeric/real/float.
    openingBalance: integer("opening_balance").notNull(),
    // Calendar date (not an instant) — Drizzle `date` mode per NFR-5.
    openingDate: date("opening_date", { mode: "date" }).notNull(),
    // Column mapping saved per account (FR-2.3) — auto-applied on next upload so
    // the mapping wizard is a one-time cost per rekening.
    savedColumnMapping: jsonb("saved_column_mapping").$type<ColumnMapping>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("bank_accounts_business_id_idx").on(t.businessId)],
);

// ---------------------------------------------------------------------------
// Upload + transaction tables (step ②)
// ---------------------------------------------------------------------------

export const uploadStatusEnum = pgEnum("upload_status", [
  "pending",
  "parsed",
  "committed",
  "undone",
  "failed",
]);

export const directionEnum = pgEnum("direction", ["in", "out"]);

export const sourceEnum = pgEnum("transaction_source", ["import", "manual"]);

export const reviewStatusEnum = pgEnum("review_status", [
  "auto",
  "reviewed",
  "needs_review",
]);

// ---------------------------------------------------------------------------
// Category + rules-engine enums (step ③)
// ---------------------------------------------------------------------------

/**
 * Accounting bucket for a category. Drives P&L / margin placement in steps ④⑤.
 * TRANSFER rows are excluded from P&L (cash-basis, CLAUDE.md).
 */
export const categoryTypeEnum = pgEnum("category_type", [
  "PENDAPATAN",
  "HPP",
  "OPEX",
  "NON_OPERASIONAL",
  "TRANSFER",
]);

/** How a rule's `pattern` is compared against a transaction description. */
export const ruleMatchTypeEnum = pgEnum("rule_match_type", ["contains", "prefix"]);

/**
 * Rule lifecycle. `active` participates in import-time matching; `pending` is a
 * staff-proposed rule awaiting admin approval (spec "proposal mechanism").
 */
export const ruleStatusEnum = pgEnum("rule_status", ["active", "pending"]);

export const uploads = pgTable(
  "uploads",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    // Null until the user selects/confirms the account for this upload.
    bankAccountId: text("bank_account_id").references(() => bankAccounts.id, {
      onDelete: "set null",
    }),
    // FR-9.3 groundwork + undo-ownership check.
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => user.id),
    blobUrl: text("blob_url").notNull(),
    originalName: text("original_name").notNull(),
    fileSize: integer("file_size").notNull(),
    status: uploadStatusEnum("status").notNull().default("pending"),
    // Snapshot of the mapping used for THIS upload (audit trail).
    columnMapping: jsonb("column_mapping").$type<ColumnMapping>(),
    presetUsed: text("preset_used"),
    // Where the mapping came from. "saved" drives the reuse badge in history;
    // "wizard" tells commitUpload to persist the mapping to the bank account.
    mappingSource: text("mapping_source").$type<MappingSource>(),
    rowCount: integer("row_count").notNull().default(0),
    skippedDupeCount: integer("skipped_dupe_count").notNull().default(0),
    failedRowCount: integer("failed_row_count").notNull().default(0),
    committedAt: timestamp("committed_at"),
    undoneAt: timestamp("undone_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("uploads_business_id_idx").on(t.businessId)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    bankAccountId: text("bank_account_id")
      .notNull()
      .references(() => bankAccounts.id, { onDelete: "cascade" }),
    // Null for future manual entries (step ③).
    uploadId: text("upload_id").references(() => uploads.id, {
      onDelete: "set null",
    }),
    // Calendar date, not a timestamp (NFR-5).
    date: date("date", { mode: "date" }).notNull(),
    description: text("description").notNull(),
    // Rupiah integer magnitude — always > 0; `direction` carries the sign.
    amount: integer("amount").notNull(),
    direction: directionEnum("direction").notNull(),
    // FK constraint added in step ③ — ON DELETE SET NULL so archiving is via a
    // soft `archived_at` flag and hard-deleting a category (not exposed in MVP)
    // would only null out assignments, never cascade-delete transactions.
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    dedupHash: text("dedup_hash").notNull(),
    source: sourceEnum("source").notNull().default("import"),
    reviewStatus: reviewStatusEnum("review_status")
      .notNull()
      .default("needs_review"),
    // Drives undo-eligibility (FR-2.7): a batch with any edited row can't undo.
    editedManually: boolean("edited_manually").notNull().default(false),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    updatedBy: text("updated_by").references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    // Dedup is unique PER BUSINESS (keeps tenants isolated in the constraint).
    unique("transactions_dedup_hash_unique").on(t.businessId, t.dedupHash),
    index("transactions_business_date_idx").on(t.businessId, t.date),
    index("transactions_upload_id_idx").on(t.uploadId),
    // Powers the needs_review badge count + the review-status filter (step ③).
    index("transactions_business_review_status_idx").on(
      t.businessId,
      t.reviewStatus,
    ),
    // Forward-looking for step ④ P&L grouping by category.
    index("transactions_business_category_idx").on(t.businessId, t.categoryId),
  ],
);

// ---------------------------------------------------------------------------
// Category + rules tables (step ③)
// ---------------------------------------------------------------------------

export const categories = pgTable(
  "categories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: categoryTypeEnum("type").notNull(),
    // Marks system-seeded rows — provenance only, still editable/archivable.
    isDefault: boolean("is_default").notNull().default(false),
    // Soft delete: archived categories are hidden from new assignments but keep
    // historical transactions.category_id assignments intact.
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    // Makes default-category seeding idempotent (ON CONFLICT DO NOTHING).
    unique("categories_business_name_unique").on(t.businessId, t.name),
    // Grouped listing in Settings + category-type filter.
    index("categories_business_type_idx").on(t.businessId, t.type),
  ],
);

export const categoryRules = pgTable(
  "category_rules",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    // Matched case-insensitively against transaction descriptions.
    pattern: text("pattern").notNull(),
    matchType: ruleMatchTypeEnum("match_type").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    // Lower number = evaluated first (PRD §7).
    priority: integer("priority").notNull(),
    status: ruleStatusEnum("status").notNull().default("active"),
    // Set when a staff correction creates a `pending` proposal.
    proposedBy: text("proposed_by").references(() => user.id),
    reviewedBy: text("reviewed_by").references(() => user.id),
    reviewedAt: timestamp("reviewed_at"),
    // Tie-break for equal priority (oldest rule wins).
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("category_rules_business_priority_idx").on(t.businessId, t.priority),
    // Pending-proposal list + active-rules fetch for matching.
    index("category_rules_business_status_idx").on(t.businessId, t.status),
  ],
);

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type BusinessMember = typeof businessMembers.$inferSelect;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type Upload = typeof uploads.$inferSelect;
export type NewUpload = typeof uploads.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CategoryRule = typeof categoryRules.$inferSelect;
export type NewCategoryRule = typeof categoryRules.$inferInsert;
