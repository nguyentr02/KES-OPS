"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { orderItems, orders, products } from "@/db/schema";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int(),
        qty: z.number().int().min(1),
      }),
    )
    .min(1),
  paymentMethod: z.enum(["cash", "transfer"]),
  discountPercent: z.union([z.literal(0), z.literal(10), z.literal(20)]).default(0),
  note: z.string().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof schema>;

export async function createOrder(input: CreateOrderInput) {
  const user = await requireUser();
  const data = schema.parse(input);

  // Recompute from the DB — never trust prices sent by the client.
  const ids = data.items.map((i) => i.productId);
  const prods = await db
    .select()
    .from(products)
    .where(inArray(products.id, ids));
  const byId = new Map(prods.map((p) => [p.id, p]));

  let revenueTotal = 0;
  let cogsTotal = 0;
  const lines = data.items.map((i) => {
    const p = byId.get(i.productId);
    if (!p) throw new Error("Sản phẩm không tồn tại.");
    const unitSalePrice = p.salePrice;
    const unitCostPrice = p.costPrice ?? 0;
    const lineSale = unitSalePrice * i.qty;
    const lineCost = unitCostPrice * i.qty;
    revenueTotal += lineSale;
    cogsTotal += lineCost;
    return {
      productId: p.id,
      nameSnapshot: p.name,
      sizeSnapshot: p.sizeLabel,
      qty: i.qty,
      unitSalePrice,
      unitCostPrice,
      lineSale,
      lineCost,
    };
  });

  // Discount is order-level; revenue received = subtotal minus the discount.
  const subtotal = revenueTotal;
  const discountAmount = Math.round((subtotal * data.discountPercent) / 100);
  const netRevenue = subtotal - discountAmount;

  const [order] = await db
    .insert(orders)
    .values({
      createdBy: user.id,
      paymentMethod: data.paymentMethod,
      note: data.note?.trim() || null,
      subtotal,
      discountPercent: data.discountPercent,
      revenueTotal: netRevenue,
      cogsTotal,
    })
    .returning({ id: orders.id });

  // neon-http has no interactive transaction: if items fail, drop the order so
  // we never leave a total with no lines behind it.
  try {
    await db.insert(orderItems).values(lines.map((l) => ({ ...l, orderId: order.id })));
  } catch (err) {
    await db.delete(orders).where(eq(orders.id, order.id));
    throw err;
  }

  revalidatePath("/orders");
  revalidatePath("/");
  return { ok: true as const, orderId: order.id };
}
