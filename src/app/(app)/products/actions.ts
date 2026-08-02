"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { products } from "@/db/schema";
import { requireUser } from "@/lib/auth";

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
