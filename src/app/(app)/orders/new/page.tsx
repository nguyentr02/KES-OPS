import { and, asc, eq } from "drizzle-orm";

import { OrderEntry, type EntryProduct } from "@/components/orders/order-entry";
import { db } from "@/db";
import { products } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const rows = await db
    .select({
      id: products.id,
      category: products.category,
      name: products.name,
      sizeLabel: products.sizeLabel,
      salePrice: products.salePrice,
    })
    .from(products)
    .where(eq(products.active, true))
    .orderBy(asc(products.sort));

  const groups: { category: string; items: EntryProduct[] }[] = [];
  for (const row of rows) {
    let group = groups.find((g) => g.category === row.category);
    if (!group) {
      group = { category: row.category, items: [] };
      groups.push(group);
    }
    group.items.push(row);
  }

  return <OrderEntry groups={groups} />;
}
