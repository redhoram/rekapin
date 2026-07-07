CREATE TYPE "public"."direction" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('auto', 'reviewed', 'needs_review');--> statement-breakpoint
CREATE TYPE "public"."transaction_source" AS ENUM('import', 'manual');--> statement-breakpoint
CREATE TYPE "public"."upload_status" AS ENUM('pending', 'parsed', 'committed', 'undone', 'failed');--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"bank_account_id" text NOT NULL,
	"upload_id" text,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"amount" integer NOT NULL,
	"direction" "direction" NOT NULL,
	"category_id" text,
	"dedup_hash" text NOT NULL,
	"source" "transaction_source" DEFAULT 'import' NOT NULL,
	"review_status" "review_status" DEFAULT 'needs_review' NOT NULL,
	"edited_manually" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_dedup_hash_unique" UNIQUE("business_id","dedup_hash")
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"bank_account_id" text,
	"uploaded_by" text NOT NULL,
	"blob_url" text NOT NULL,
	"original_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"status" "upload_status" DEFAULT 'pending' NOT NULL,
	"column_mapping" jsonb,
	"preset_used" text,
	"row_count" integer DEFAULT 0 NOT NULL,
	"skipped_dupe_count" integer DEFAULT 0 NOT NULL,
	"failed_row_count" integer DEFAULT 0 NOT NULL,
	"committed_at" timestamp,
	"undone_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD COLUMN "saved_column_mapping" jsonb;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_business_date_idx" ON "transactions" USING btree ("business_id","date");--> statement-breakpoint
CREATE INDEX "transactions_upload_id_idx" ON "transactions" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "uploads_business_id_idx" ON "uploads" USING btree ("business_id");