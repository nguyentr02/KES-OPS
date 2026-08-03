import { asc } from "drizzle-orm";

import { ProductsManager } from "@/components/products/products-manager";
import { db } from "@/db";
import { components, ingredients, products, recipeItems } from "@/db/schema";
import { lineUnitCost, loadCostGraph } from "@/lib/costing";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  // All independent — one parallel wave instead of five serial round-trips.
  const [graph, prods, rItems, ings, comps] = await Promise.all([
    loadCostGraph(),
    db.select().from(products).orderBy(asc(products.sort)),
    db.select().from(recipeItems),
    db.select().from(ingredients),
    db.select().from(components),
  ]);
  const ingById = new Map(ings.map((i) => [i.id, i]));
  const compById = new Map(comps.map((c) => [c.id, c]));

  const recipeByProduct = new Map<
    number,
    { label: string; qty: number; lineCost: number }[]
  >();
  for (const ri of rItems) {
    const unit = lineUnitCost(ri, graph);
    const label =
      ri.refType === "component"
        ? (ri.componentId != null ? compById.get(ri.componentId)?.name : "")
        : (ri.ingredientId != null ? ingById.get(ri.ingredientId)?.name : "");
    const arr = recipeByProduct.get(ri.productId) ?? [];
    arr.push({ label: label ?? "?", qty: ri.qty, lineCost: ri.qty * unit });
    recipeByProduct.set(ri.productId, arr);
  }

  const groups: {
    category: string;
    items: (typeof prods[number] & {
      recipe: { label: string; qty: number; lineCost: number }[];
    })[];
  }[] = [];
  for (const p of prods) {
    let g = groups.find((x) => x.category === p.category);
    if (!g) {
      g = { category: p.category, items: [] };
      groups.push(g);
    }
    g.items.push({ ...p, recipe: recipeByProduct.get(p.id) ?? [] });
  }

  return (
    <>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Giá vốn được tính tự động từ công thức. Sửa giá bán ở đây; sửa giá vốn
        bằng cách đổi giá nguyên liệu (tab Nguyên liệu).
      </p>
      <ProductsManager groups={groups} />
    </>
  );
}
