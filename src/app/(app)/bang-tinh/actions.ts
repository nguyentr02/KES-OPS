"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { sheets } from "@/db/schema";
import { requireUser } from "@/lib/auth";

/**
 * Persist the Univer workbook snapshot. v1 keeps a single shared workbook, so
 * we upsert the first (and only) row.
 */
export async function saveSheet(data: unknown) {
  await requireUser();

  const [existing] = await db
    .select({ id: sheets.id })
    .from(sheets)
    .orderBy(asc(sheets.id))
    .limit(1);

  if (existing) {
    await db
      .update(sheets)
      .set({ data, updatedAt: new Date() })
      .where(eq(sheets.id, existing.id));
  } else {
    await db.insert(sheets).values({ data });
  }

  revalidatePath("/bang-tinh");
  return { ok: true as const };
}
