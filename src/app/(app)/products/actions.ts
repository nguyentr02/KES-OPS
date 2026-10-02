"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { products, recipeItems } from "@/db/schema";
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
