CREATE TYPE "public"."category_type" AS ENUM('PENDAPATAN', 'HPP', 'OPEX', 'NON_OPERASIONAL', 'TRANSFER');--> statement-breakpoint
CREATE TYPE "public"."rule_match_type" AS ENUM('contains', 'prefix');--> statement-breakpoint
CREATE TYPE "public"."rule_status" AS ENUM('active', 'pending');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "category_type" NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_business_name_unique" UNIQUE("business_id","name")
);
--> statement-breakpoint
CREATE TABLE "category_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"pattern" text NOT NULL,
	"match_type" "rule_match_type" NOT NULL,
	"category_id" text NOT NULL,
	"priority" integer NOT NULL,
	"status" "rule_status" DEFAULT 'active' NOT NULL,
	"proposed_by" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_rules" ADD CONSTRAINT "category_rules_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_rules" ADD CONSTRAINT "category_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_rules" ADD CONSTRAINT "category_rules_proposed_by_user_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_rules" ADD CONSTRAINT "category_rules_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_business_type_idx" ON "categories" USING btree ("business_id","type");--> statement-breakpoint
CREATE INDEX "category_rules_business_priority_idx" ON "category_rules" USING btree ("business_id","priority");--> statement-breakpoint
CREATE INDEX "category_rules_business_status_idx" ON "category_rules" USING btree ("business_id","status");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_business_review_status_idx" ON "transactions" USING btree ("business_id","review_status");--> statement-breakpoint
CREATE INDEX "transactions_business_category_idx" ON "transactions" USING btree ("business_id","category_id");