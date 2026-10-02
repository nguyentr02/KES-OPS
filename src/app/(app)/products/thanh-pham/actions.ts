"use server";

import { count, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { componentItems, components, recipeItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { recomputeCosts } from "@/lib/costing";

function revalidateProducts() {
  revalidatePath("/products");
  revalidatePath("/products/nguyen-lieu");
  revalidatePath("/products/thanh-pham");
}

const fields = {
  name: z.string().trim().min(1).max(120),
  unit: z.string().trim().min(1).max(40),
  /** Batch size the lines below produce — the divisor for the unit cost. */
  yieldQty: z.number().positive(),
  lines: z
    .array(
      z.object({
        ingredientId: z.number().int().positive(),
        qty: z.number().positive(),
      }),
    )
    .max(50),
};

const updateSchema = z.object({ id: z.number().int(), ...fields });

/** Replace a component and its whole ingredient list, then recost everything. */
export async function updateComponent(input: z.infer<typeof updateSchema>) {
  await requireUser();
  const d = updateSchema.parse(input);

  await db
    .update(components)
    .set({ name: d.name, unit: d.unit, yieldQty: d.yieldQty })
    .where(eq(components.id, d.id));

  // Replace-all, like a product recipe: nothing references a line by id.
  await db.delete(componentItems).where(eq(componentItems.componentId, d.id));
  if (d.lines.length > 0) {
    await db
      .insert(componentItems)
      .values(d.lines.map((l) => ({ ...l, componentId: d.id })));
  }

  await recomputeCosts();
  revalidateProducts();
  return { ok: true as const };
}

const createSchema = z.object(fields);

export async function createComponent(input: z.infer<typeof createSchema>) {
  await requireUser();
  const d = createSchema.parse(input);
  const [{ value }] = await db
    .select({ value: max(components.sort) })
    .from(components);
  const [row] = await db
    .insert(components)
    .values({
      name: d.name,
      unit: d.unit,
      yieldQty: d.yieldQty,
      sort: (value ?? 0) + 1,
    })
    .returning({ id: components.id });

  if (d.lines.length > 0) {
    await db
      .insert(componentItems)
      .values(d.lines.map((l) => ({ ...l, componentId: row.id })));
  }

  await recomputeCosts();
  revalidateProducts();
  return { ok: true as const, id: row.id };
}

/**
 * Delete a component. Its own ingredient lines cascade, but a product recipe
 * pointing at it does not — refuse in that case rather than hit the FK.
 */
export async function deleteComponent(input: { id: number }) {
  await requireUser();
  const id = z.number().int().parse(input.id);

  const [inRecipes] = await db
    .select({ n: count() })
    .from(recipeItems)
    .where(eq(recipeItems.componentId, id));
  if (inRecipes.n > 0) {
    return {
      ok: false as const,
      reason: `Đang được dùng trong ${inRecipes.n} công thức món. Gỡ khỏi đó trước khi xoá.`,
    };
  }

  await db.delete(components).where(eq(components.id, id));
  await recomputeCosts();
  revalidateProducts();
  return { ok: true as const };
}
