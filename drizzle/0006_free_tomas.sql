CREATE TABLE "prep_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_name" text NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prep_steps_product_name_unique" UNIQUE("product_name")
);
