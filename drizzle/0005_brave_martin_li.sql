CREATE TABLE "sheets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'Bảng tính' NOT NULL,
	"data" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
