"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { expenses } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";

const schema = z.object({
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.number().int().min(1),
  note: z.string().max(500).optional(),
});

export type CreateExpenseInput = z.infer<typeof schema>;

export async function createExpense(input: CreateExpenseInput) {
  const user = await requireUser();
  const data = schema.parse(input);

  await db.insert(expenses).values({
    spentOn: data.spentOn,
    category: data.category,
    amount: data.amount,
    note: data.note?.trim() || null,
    createdBy: user.id,
  });

  revalidatePath("/expenses");
  revalidatePath("/");
  return { ok: true as const };
}

export async function deleteExpense(id: number) {
  await requireUser();
  await db.delete(expenses).where(eq(expenses.id, id));
  revalidatePath("/expenses");
  revalidatePath("/");
  return { ok: true as const };
}
