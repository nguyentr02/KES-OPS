import { config } from "dotenv";

import { db } from "./index";
import {
  components,
  componentItems,
  ingredients,
  products,
  recipeItems,
} from "./schema";
import { recomputeCosts } from "@/lib/costing";
import seed from "./costing-seed.json";

config({ path: ".env.local" });

type Seed = {
  ingredients: { name: string; unit: string; packSize: number; purchasePrice: number }[];
  components: {
    name: string;
    unit: string;
    yield: number;
    lines: { ingredient: string; qty: number }[];
  }[];
  recipes: {
    product: string;
    size: string | null;
    lines: { ref: string; type: "ingredient" | "component"; qty: number }[];
  }[];
};

const data = seed as Seed;

async function main() {
  // Reset (respect FKs): recipe lines → component lines → components → ingredients.
  await db.delete(recipeItems);
  await db.delete(componentItems);
  await db.delete(components);
  await db.delete(ingredients);

  // Ingredients
  await db.insert(ingredients).values(
    data.ingredients.map((i, idx) => ({
      name: i.name,
      unit: i.unit,
      packSize: i.packSize,
      purchasePrice: i.purchasePrice,
      sort: idx,
    })),
  );
  const ingRows = await db.select().from(ingredients);
  const ingId = new Map(ingRows.map((r) => [r.name, r.id]));

  // Components + their ingredient lines
  for (const [idx, c] of data.components.entries()) {
    const [comp] = await db
      .insert(components)
      .values({ name: c.name, unit: c.unit, yieldQty: c.yield, sort: idx })
      .returning({ id: components.id });
    const lines = c.lines
      .map((l) => ({
        componentId: comp.id,
        ingredientId: ingId.get(l.ingredient),
        qty: l.qty,
      }))
      .filter((l) => l.ingredientId != null) as {
      componentId: number;
      ingredientId: number;
      qty: number;
    }[];
    if (lines.length) await db.insert(componentItems).values(lines);
  }
  const compRows = await db.select().from(components);
  const compId = new Map(compRows.map((r) => [r.name, r.id]));

  // Products lookup by name + size
  const prodRows = await db.select().from(products);
  const prodId = new Map(
    prodRows.map((p) => [`${p.name}__${p.sizeLabel ?? ""}`, p.id]),
  );

  // Recipe lines
  let recipeCount = 0;
  for (const r of data.recipes) {
    const pid = prodId.get(`${r.product}__${r.size ?? ""}`);
    if (pid == null) {
      console.warn(`No product match: ${r.product} (${r.size ?? "—"})`);
      continue;
    }
    const rows = r.lines
      .map((l) => ({
        productId: pid,
        refType: l.type,
        ingredientId: l.type === "ingredient" ? (ingId.get(l.ref) ?? null) : null,
        componentId: l.type === "component" ? (compId.get(l.ref) ?? null) : null,
        qty: l.qty,
      }))
      .filter((l) => l.ingredientId != null || l.componentId != null);
    if (rows.length) {
      await db.insert(recipeItems).values(rows);
      recipeCount++;
    }
  }

  await recomputeCosts();
  console.log(
    `Seeded ${data.ingredients.length} ingredients, ${data.components.length} components, ${recipeCount} recipes. Costs recomputed.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
