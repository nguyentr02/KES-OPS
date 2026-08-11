"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { activityLogs, orderItems, orders, products } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatVnd, paymentLabel } from "@/lib/format";

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
  // Manual override of the money actually received (tip added / amount taken
  // off). When set it wins over the computed net; profit reflects it.
  finalTotal: z.number().int().min(0).max(100_000_000).optional(),
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

  // Discount is order-level; revenue received = subtotal minus the discount,
  // unless the staff manually overrode the final amount (tip / take-off).
  const subtotal = revenueTotal;
  const discountAmount = Math.round((subtotal * data.discountPercent) / 100);
  const netRevenue = data.finalTotal ?? subtotal - discountAmount;

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

const updateSchema = z.object({
  revenueTotal: z.number().int().min(0).max(100_000_000),
  paymentMethod: z.enum(["cash", "transfer"]),
  note: z.string().max(500).optional(),
});

export type UpdateOrderInput = z.infer<typeof updateSchema>;

/** Edit a saved order's money/payment/note (e.g. add a tip or take some off). */
export async function updateOrder(orderId: number, input: UpdateOrderInput) {
  const user = await requireUser();
  const data = updateSchema.parse(input);

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) return { ok: false as const };

  await db
    .update(orders)
    .set({
      revenueTotal: data.revenueTotal,
      paymentMethod: data.paymentMethod,
      note: data.note?.trim() || null,
    })
    .where(eq(orders.id, orderId));

  // Record the change (money is the meaningful edit) in the audit trail.
  if (order.revenueTotal !== data.revenueTotal) {
    const summary = `Đơn #${orderId} · ${formatVnd(order.revenueTotal)} → ${formatVnd(data.revenueTotal)}`;
    await db
      .insert(activityLogs)
      .values({ action: "Sửa đơn hàng", summary, actorName: user.name });
  }

  revalidatePath("/orders");
  revalidatePath("/");
  revalidatePath("/lich-su");
  return { ok: true as const };
}

export async function deleteOrder(orderId: number) {
  const user = await requireUser();

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) return { ok: false as const };

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  const itemsStr =
    items
      .map(
        (i) =>
          `${i.nameSnapshot}${i.sizeSnapshot ? ` (${i.sizeSnapshot})` : ""} ×${i.qty}`,
      )
      .join(", ") || "—";
  const summary = `Đơn #${order.id} · ${formatVnd(order.revenueTotal)} · ${itemsStr} · ${paymentLabel[order.paymentMethod] ?? order.paymentMethod}`;

  // Cascade removes order_items; then record the deletion in the audit log.
  await db.delete(orders).where(eq(orders.id, orderId));
  await db
    .insert(activityLogs)
    .values({ action: "Xóa đơn hàng", summary, actorName: user.name });

  revalidatePath("/orders");
  revalidatePath("/");
  revalidatePath("/lich-su");
  return { ok: true as const };
}
