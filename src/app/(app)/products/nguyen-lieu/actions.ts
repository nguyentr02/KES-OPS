"use server";

import { count, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { componentItems, ingredients, recipeItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { recomputeCosts } from "@/lib/costing";

/** Every tab shows a cost derived from ingredient prices, so all three refresh. */
function revalidateProducts() {
  revalidatePath("/products");
  revalidatePath("/products/nguyen-lieu");
  revalidatePath("/products/thanh-pham");
}

const fields = {
  name: z.string().trim().min(1).max(120),
  unit: z.string().trim().min(1).max(40),
  packSize: z.number().positive(),
  purchasePrice: z.number().min(0),
};

const updateSchema = z.object({ id: z.number().int(), ...fields });

export async function updateIngredient(input: z.infer<typeof updateSchema>) {
  await requireUser();
  const d = updateSchema.parse(input);
  await db
    .update(ingredients)
    .set({
      name: d.name,
      unit: d.unit,
      packSize: d.packSize,
      purchasePrice: d.purchasePrice,
    })
    .where(eq(ingredients.id, d.id));

  // A price change ripples into component and product costs.
  await recomputeCosts();
  revalidateProducts();
  return { ok: true as const };
}

const createSchema = z.object(fields);

export async function createIngredient(input: z.infer<typeof createSchema>) {
  await requireUser();
  const d = createSchema.parse(input);
  const [{ value }] = await db
    .select({ value: max(ingredients.sort) })
    .from(ingredients);
  const [row] = await db
    .insert(ingredients)
    .values({ ...d, sort: (value ?? 0) + 1 })
    .returning({ id: ingredients.id });

  revalidateProducts();
  return { ok: true as const, id: row.id };
}

/**
 * Delete an ingredient — refused while anything still references it, because
 * the FK would reject it anyway and a counted message says where to look.
 */
export async function deleteIngredient(input: { id: number }) {
  await requireUser();
  const id = z.number().int().parse(input.id);

  const [inComponents, inRecipes] = await Promise.all([
    db
      .select({ n: count() })
      .from(componentItems)
      .where(eq(componentItems.ingredientId, id)),
    db
      .select({ n: count() })
      .from(recipeItems)
      .where(eq(recipeItems.ingredientId, id)),
  ]);
  const used = inComponents[0].n + inRecipes[0].n;
  if (used > 0) {
    const where = [
      inComponents[0].n > 0 && `${inComponents[0].n} thành phẩm`,
      inRecipes[0].n > 0 && `${inRecipes[0].n} công thức món`,
    ]
      .filter(Boolean)
      .join(" và ");
    return {
      ok: false as const,
      reason: `Đang được dùng trong ${where}. Gỡ khỏi đó trước khi xoá.`,
    };
  }

  await db.delete(ingredients).where(eq(ingredients.id, id));
  revalidateProducts();
  return { ok: true as const };
}
