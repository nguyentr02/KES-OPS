import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  components,
  componentItems,
  ingredients,
  products,
  recipeItems,
} from "@/db/schema";

/** Raw ingredient unit price = purchase price / pack size (đồng per g/ml/set). */
export function unitPriceOf(ing: {
  packSize: number;
  purchasePrice: number;
}): number {
  return ing.packSize ? ing.purchasePrice / ing.packSize : 0;
}

export interface CostGraph {
  /** ingredientId → unit price */
  ingUnit: Map<number, number>;
  /** componentId → unit cost */
  compUnit: Map<number, number>;
}

/** Load ingredients + components and compute their unit costs (no writes). */
export async function loadCostGraph(): Promise<CostGraph> {
  // Independent reads — run them in one round-trip wave, not serially.
  const [ings, comps, cItems] = await Promise.all([
    db.select().from(ingredients),
    db.select().from(components),
    db.select().from(componentItems),
  ]);
  const ingUnit = new Map(ings.map((i) => [i.id, unitPriceOf(i)]));

  const compUnit = new Map<number, number>();
  for (const c of comps) {
    const items = cItems.filter((ci) => ci.componentId === c.id);
    const total = items.reduce(
      (s, ci) => s + ci.qty * (ingUnit.get(ci.ingredientId) ?? 0),
      0,
    );
    compUnit.set(c.id, c.yieldQty ? total / c.yieldQty : 0);
  }
  return { ingUnit, compUnit };
}

/** Unit cost of a single recipe line, given the cost graph. */
export function lineUnitCost(
  line: {
    refType: string;
    ingredientId: number | null;
    componentId: number | null;
  },
  graph: CostGraph,
): number {
  if (line.refType === "component") {
    return line.componentId != null
      ? (graph.compUnit.get(line.componentId) ?? 0)
      : 0;
  }
  return line.ingredientId != null
    ? (graph.ingUnit.get(line.ingredientId) ?? 0)
    : 0;
}

/**
 * Recompute every product's giá vốn from its recipe and write it to
 * products.costPrice. Called after any ingredient/component/recipe change.
 * Products with no recipe lines are left untouched.
 */
export async function recomputeCosts(): Promise<void> {
  const graph = await loadCostGraph();
  const rItems = await db.select().from(recipeItems);

  const byProduct = new Map<number, typeof rItems>();
  for (const ri of rItems) {
    const list = byProduct.get(ri.productId);
    if (list) list.push(ri);
    else byProduct.set(ri.productId, [ri]);
  }

  // Update every product's cost concurrently instead of one-at-a-time.
  await Promise.all(
    [...byProduct].map(([productId, lines]) => {
      const cost = lines.reduce(
        (s, ri) => s + ri.qty * lineUnitCost(ri, graph),
        0,
      );
      return db
        .update(products)
        .set({ costPrice: cost })
        .where(eq(products.id, productId));
    }),
  );
}
