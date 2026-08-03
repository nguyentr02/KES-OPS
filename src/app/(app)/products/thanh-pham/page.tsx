import { asc } from "drizzle-orm";

import { db } from "@/db";
import { componentItems, components, ingredients } from "@/db/schema";
import { loadCostGraph } from "@/lib/costing";
import { formatVnd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ComponentsPage() {
  const [graph, comps, items, ings] = await Promise.all([
    loadCostGraph(),
    db.select().from(components).orderBy(asc(components.sort)),
    db.select().from(componentItems),
    db.select().from(ingredients),
  ]);
  const ingById = new Map(ings.map((i) => [i.id, i]));

  return (
    <>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Thành phẩm sơ chế (cà phê cốt, kem muối…). Đơn giá tính từ nguyên liệu và
        định lượng — đổi giá nguyên liệu là các số này tự cập nhật.
      </p>
      <div className="flex flex-col gap-3">
        {comps.map((c) => {
          const lines = items.filter((it) => it.componentId === c.id);
          const unit = graph.compUnit.get(c.id) ?? 0;
          return (
            <div key={c.id} className="rounded-xl border border-border/60 bg-card p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{c.name}</span>
                <span className="font-semibold tabular-nums">
                  {formatVnd(unit)}/{c.unit}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Định lượng: {c.yieldQty} {c.unit}
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {lines.map((l) => {
                  const ing = ingById.get(l.ingredientId);
                  const up = graph.ingUnit.get(l.ingredientId) ?? 0;
                  return (
                    <li
                      key={l.id}
                      className="flex justify-between gap-2 text-muted-foreground"
                    >
                      <span>
                        {ing?.name} × {l.qty}
                        {ing?.unit}
                      </span>
                      <span className="tabular-nums">{formatVnd(l.qty * up)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}
