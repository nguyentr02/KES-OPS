"use server";

import { and, eq, isNull, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { prepSteps, products, recipeItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { recomputeCosts } from "@/lib/costing";

// Cost (giá vốn) is computed from the recipe now, so it's not editable here —
// only the sale price and active flag.
const schema = z.object({
  id: z.number().int(),
  salePrice: z.number().int().min(0),
  active: z.boolean(),
});

export type UpdateProductInput = z.infer<typeof schema>;

export async function updateProduct(input: UpdateProductInput) {
  await requireUser();
  const data = schema.parse(input);

  await db
    .update(products)
    .set({ salePrice: data.salePrice, active: data.active })
    .where(eq(products.id, data.id));

  revalidatePath("/products");
  return { ok: true as const };
}

const recipeSchema = z.object({
  productId: z.number().int(),
  lines: z
    .array(
      z.object({
        refType: z.enum(["ingredient", "component"]),
        refId: z.number().int().positive(),
        qty: z.number().positive(),
      }),
    )
    .max(50),
});

export type SaveRecipeInput = z.infer<typeof recipeSchema>;

/**
 * Replace a product's whole recipe, then recompute giá vốn across the board.
 *
 * Replace-all rather than per-line CRUD: the editor submits the finished list,
 * and nothing references a recipe line by id (orders snapshot their own cost),
 * so the ids are free to churn.
 */
export async function saveRecipe(input: SaveRecipeInput) {
  await requireUser();
  const { productId, lines } = recipeSchema.parse(input);

  await db.delete(recipeItems).where(eq(recipeItems.productId, productId));

  if (lines.length > 0) {
    await db.insert(recipeItems).values(
      lines.map((l) => ({
        productId,
        refType: l.refType,
        ingredientId: l.refType === "ingredient" ? l.refId : null,
        componentId: l.refType === "component" ? l.refId : null,
        qty: l.qty,
      })),
    );
  } else {
    // recomputeCosts() only touches products that have lines, so clearing the
    // last line has to clear the cost here — giá vốn with no recipe is unknown,
    // not zero (a 0 would read as 100% margin on the dashboard).
    await db
      .update(products)
      .set({ costPrice: null })
      .where(eq(products.id, productId));
  }

  await recomputeCosts();
  revalidatePath("/products");
  revalidatePath("/products/thanh-pham");
  return { ok: true as const };
}

const stepsSchema = z.object({
  productName: z.string().trim().min(1).max(120),
  steps: z.array(z.string().trim().min(1).max(500)).max(30),
});

export type SavePrepStepsInput = z.infer<typeof stepsSchema>;

/**
 * Save a drink's preparation steps. Keyed by name so every size of the drink
 * shares one procedure — see the prepSteps table comment.
 */
export async function savePrepSteps(input: SavePrepStepsInput) {
  await requireUser();
  const { productName, steps } = stepsSchema.parse(input);

  await db
    .insert(prepSteps)
    .values({ productName, steps, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: prepSteps.productName,
      set: { steps, updatedAt: new Date() },
    });

  revalidatePath("/products");
  return { ok: true as const };
}

const sizeRow = z.object({
  label: z.enum(["S", "M"]).nullable(),
  salePrice: z.number().int().positive(),
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(60),
  /** One row per size — a drink with S and M is two product rows. */
  sizes: z.array(sizeRow).min(1).max(2),
});

export type CreateProductInput = z.infer<typeof createSchema>;

/**
 * Add a drink. Sizes are separate product rows, so this inserts one or two.
 * Giá vốn starts null — it comes from the recipe, which is built afterwards.
 */
export async function createProduct(input: CreateProductInput) {
  await requireUser();
  const d = createSchema.parse(input);

  const labels = d.sizes.map((s) => s.label);
  if (new Set(labels).size !== labels.length) {
    return { ok: false as const, reason: "Trùng size trong cùng một món." };
  }

  // A product is identified by name + size, so reject a clash on either row
  // before inserting any of them.
  for (const size of d.sizes) {
    const clash = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.name, d.name),
          size.label === null
            ? isNull(products.sizeLabel)
            : eq(products.sizeLabel, size.label),
        ),
      )
      .limit(1);
    if (clash.length > 0) {
      return {
        ok: false as const,
        reason: `Đã có món "${d.name}"${size.label ? ` size ${size.label}` : ""}.`,
      };
    }
  }

  const [{ value }] = await db.select({ value: max(products.sort) }).from(products);
  const base = (value ?? 0) + 1;

  await db.insert(products).values(
    d.sizes.map((size, i) => ({
      category: d.category,
      name: d.name,
      sizeLabel: size.label,
      salePrice: size.salePrice,
      sort: base + i,
    })),
  );

  revalidatePath("/products");
  return { ok: true as const };
}
