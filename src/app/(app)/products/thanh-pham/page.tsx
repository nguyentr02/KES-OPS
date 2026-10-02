import { asc } from "drizzle-orm";

import {
  ComponentsManager,
  type ComponentView,
  type IngredientRef,
} from "@/components/products/components-manager";
import { db } from "@/db";
import { componentItems, components, ingredients } from "@/db/schema";
import { loadCostGraph } from "@/lib/costing";

export const dynamic = "force-dynamic";

export default async function ComponentsPage() {
  const [graph, comps, items, ings] = await Promise.all([
    loadCostGraph(),
    db.select().from(components).orderBy(asc(components.sort)),
    db.select().from(componentItems),
    db.select().from(ingredients).orderBy(asc(ingredients.sort)),
  ]);

  const refs: IngredientRef[] = ings.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    unitCost: graph.ingUnit.get(i.id) ?? 0,
  }));

  const views: ComponentView[] = comps.map((c) => ({
    id: c.id,
    name: c.name,
    unit: c.unit,
    yieldQty: c.yieldQty,
    lines: items
      .filter((it) => it.componentId === c.id)
      .map((it) => ({ ingredientId: it.ingredientId, qty: it.qty })),
  }));

  return (
    <>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Thành phẩm sơ chế (cà phê cốt, kem muối…). Đơn giá = tổng tiền nguyên
        liệu chia cho định lượng mẻ. Thêm, sửa hoặc xoá ở đây; thành phẩm đang
        được dùng trong công thức món thì không xoá được.
      </p>
      <ComponentsManager components={views} ingredients={refs} />
    </>
  );
}
