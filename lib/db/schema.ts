import {
  pgTable,
  pgEnum,
  text,
  boolean,
  integer,
  timestamp,
  date,
  unique,
  index,
} from "drizzle-orm/pg-core";

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

export const session = pgTable("session", {
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
});

export const account = pgTable("account", {
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
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("bank_accounts_business_id_idx").on(t.businessId)],
);

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type BusinessMember = typeof businessMembers.$inferSelect;
export type BankAccount = typeof bankAccounts.$inferSelect;
