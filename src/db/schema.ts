import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Staff accounts. No self-registration — rows are seeded/managed by the owner. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * One row per sellable SKU (a drink at a given size). `costPrice` (giá vốn) is
 * nullable until the owner fills it in — profit is COGS-based, so it drives the
 * margin. Seeded from the website menu.
 */
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  sizeLabel: text("size_label"), // "S" | "M" | null (single-size)
  salePrice: integer("sale_price").notNull(),
  // giá vốn — exact value from the accounting workbook (may have decimals); null until set.
  costPrice: numeric("cost_price", { mode: "number" }),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** One sale. `revenueTotal`/`cogsTotal` are snapshot sums for fast reporting. */
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: integer("created_by").references(() => users.id),
  paymentMethod: text("payment_method").notNull(), // "cash" | "transfer"
  note: text("note"),
  subtotal: integer("subtotal").notNull().default(0), // before discount
  discountPercent: integer("discount_percent").notNull().default(0), // 0/10/20
  revenueTotal: integer("revenue_total").notNull(), // after discount = money received
  cogsTotal: numeric("cogs_total", { mode: "number" }).notNull(), // exact, from decimal costs
});

/** Line items. Prices are snapshotted so later product edits don't rewrite history. */
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id),
  nameSnapshot: text("name_snapshot").notNull(),
  sizeSnapshot: text("size_snapshot"),
  qty: integer("qty").notNull(),
  unitSalePrice: integer("unit_sale_price").notNull(),
  // Cost snapshots are numeric to preserve the exact (decimal) giá vốn.
  unitCostPrice: numeric("unit_cost_price", { mode: "number" })
    .notNull()
    .default(0),
  lineSale: integer("line_sale").notNull(),
  lineCost: numeric("line_cost", { mode: "number" }).notNull(),
});

/**
 * Overhead only — rent, salaries, utilities, marketing. Ingredient cost is NOT
 * logged here; it's captured per-drink via product costPrice, so logging it as
 * an expense too would double-count against profit.
 */
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  spentOn: date("spent_on").notNull(),
  category: text("category").notNull(),
  amount: integer("amount").notNull(),
  note: text("note"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Raw materials (Đầu vào). unitPrice is derived = purchasePrice / packSize. */
export const ingredients = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  unit: text("unit").notNull(), // g | ml | set | chai
  packSize: numeric("pack_size", { mode: "number" }).notNull(),
  purchasePrice: numeric("purchase_price", { mode: "number" }).notNull(),
  sort: integer("sort").notNull().default(0),
});

/** Semi-finished preparations (Thành phẩm thô). unitCost = Σ(item)/yieldQty. */
export const components = pgTable("components", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  yieldQty: numeric("yield_qty", { mode: "number" }).notNull(),
  sort: integer("sort").notNull().default(0),
});

/** Ingredient lines that make up a component. */
export const componentItems = pgTable("component_items", {
  id: serial("id").primaryKey(),
  componentId: integer("component_id")
    .notNull()
    .references(() => components.id, { onDelete: "cascade" }),
  ingredientId: integer("ingredient_id")
    .notNull()
    .references(() => ingredients.id),
  qty: numeric("qty", { mode: "number" }).notNull(),
});

/** A product's recipe line — references a component OR a raw ingredient. */
export const recipeItems = pgTable("recipe_items", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  refType: text("ref_type").notNull(), // "ingredient" | "component"
  ingredientId: integer("ingredient_id").references(() => ingredients.id),
  componentId: integer("component_id").references(() => components.id),
  qty: numeric("qty", { mode: "number" }).notNull(),
});

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Ingredient = typeof ingredients.$inferSelect;
export type Component = typeof components.$inferSelect;
export type ComponentItem = typeof componentItems.$inferSelect;
export type RecipeItem = typeof recipeItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
