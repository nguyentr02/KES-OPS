import { asc } from "drizzle-orm";

import {
  ProductsManager,
  type CatalogRef,
} from "@/components/products/products-manager";
import { db } from "@/db";
import { components, ingredients, products, recipeItems } from "@/db/schema";
import { loadCostGraph } from "@/lib/costing";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  // All independent — one parallel wave instead of five serial round-trips.
  const [graph, prods, rItems, ings, comps] = await Promise.all([
    loadCostGraph(),
    db.select().from(products).orderBy(asc(products.sort)),
    db.select().from(recipeItems),
    db.select().from(ingredients).orderBy(asc(ingredients.sort)),
    db.select().from(components).orderBy(asc(components.sort)),
  ]);

  // Everything a recipe line may point at, with the unit cost the editor needs
  // to price a line as you type. `key` is what the <Select> stores.
  const catalog: CatalogRef[] = [
    ...comps.map((c) => ({
      key: `component:${c.id}`,
      refType: "component" as const,
      refId: c.id,
      name: c.name,
      unit: c.unit,
      unitCost: graph.compUnit.get(c.id) ?? 0,
    })),
    ...ings.map((i) => ({
      key: `ingredient:${i.id}`,
      refType: "ingredient" as const,
      refId: i.id,
      name: i.name,
      unit: i.unit,
      unitCost: graph.ingUnit.get(i.id) ?? 0,
    })),
  ];

  const recipeByProduct = new Map<number, { key: string; qty: number }[]>();
  for (const ri of rItems) {
    const key =
      ri.refType === "component"
        ? `component:${ri.componentId}`
        : `ingredient:${ri.ingredientId}`;
    const arr = recipeByProduct.get(ri.productId) ?? [];
    arr.push({ key, qty: ri.qty });
    recipeByProduct.set(ri.productId, arr);
  }

  const groups: {
    category: string;
    items: ((typeof prods)[number] & {
      recipe: { key: string; qty: number }[];
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
        Giá vốn được tính tự động từ công thức. Sửa giá bán và công thức ở đây;
        giá nguyên liệu gốc sửa ở tab Nguyên liệu.
      </p>
      <ProductsManager groups={groups} catalog={catalog} />
    </>
  );
}
