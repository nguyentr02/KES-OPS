import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { Receipt, type ReceiptData } from "@/components/orders/receipt";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) notFound();

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.id));

  const data: ReceiptData = {
    id: order.id,
    createdAt: order.createdAt.toISOString(),
    paymentMethod: order.paymentMethod,
    discountPercent: order.discountPercent,
    subtotal: order.subtotal,
    revenueTotal: order.revenueTotal,
    note: order.note,
    items: items.map((it) => ({
      name: it.nameSnapshot,
      size: it.sizeSnapshot,
      qty: it.qty,
      unit: it.unitSalePrice,
      line: it.lineSale,
    })),
  };

  return <Receipt data={data} />;
}
