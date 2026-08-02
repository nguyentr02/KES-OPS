ALTER TABLE "order_items" ALTER COLUMN "unit_cost_price" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "line_cost" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "cogs_total" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "cost_price" SET DATA TYPE numeric;