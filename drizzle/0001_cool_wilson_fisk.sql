ALTER TABLE "orders" ADD COLUMN "subtotal" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_percent" integer DEFAULT 0 NOT NULL;