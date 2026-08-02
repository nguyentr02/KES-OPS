"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { ingredients } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { recomputeCosts } from "@/lib/costing";

const schema = z.object({
  id: z.number().int(),
  packSize: z.number().positive(),
  purchasePrice: z.number().min(0),
});

export async function updateIngredient(input: z.infer<typeof schema>) {
  await requireUser();
  const d = schema.parse(input);
  await db
    .update(ingredients)
    .set({ packSize: d.packSize, purchasePrice: d.purchasePrice })
    .where(eq(ingredients.id, d.id));

  // A price change ripples into component and product costs.
  await recomputeCosts();
  revalidatePath("/products");
  revalidatePath("/products/nguyen-lieu");
  revalidatePath("/products/thanh-pham");
  return { ok: true as const };
}
