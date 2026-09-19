import { and, eq, isNull } from "drizzle-orm";
import { config } from "dotenv";

import { db } from "./index";
import { products } from "./schema";

config({ path: ".env.local" });

/**
 * Push the printed menu's sale prices onto the live products table.
 * Idempotent — rows already at the target price are left alone, and it only
 * touches `salePrice`, never `costPrice` (that comes from the recipe).
 *
 * Run after changing the menu:  npx tsx src/db/sync-menu.ts
 *
 * Keep this list in step with `seed.ts` (MENU) and the website's
 * `frontend/src/data/menu.ts`. Products not listed here are left untouched —
 * so off-menu SKUs (Cà Phê Đen Chai, the retired Trà Chanh Vàng Macchiato)
 * keep whatever price and active flag they already have.
 */
const PRICES: { name: string; size: "S" | "M" | null; price: number }[] = [
  { name: "Cà Phê Đen", size: "S", price: 21000 },
  { name: "Cà Phê Đen", size: "M", price: 26000 },
  { name: "Cà Phê Sữa SG", size: "S", price: 23000 },
  { name: "Cà Phê Sữa SG", size: "M", price: 28000 },
  { name: "Cà Phê Muối", size: "S", price: 27000 },
  { name: "Cà Phê Muối", size: "M", price: 34000 },
  { name: "Cà Phê Kem Bơ Đậu Phộng", size: "S", price: 29000 },
  { name: "Cà Phê Kem Bơ Đậu Phộng", size: "M", price: 36000 },
  { name: "Bạc Xỉu", size: "S", price: 27000 },
  { name: "Bạc Xỉu", size: "M", price: 34000 },
  { name: "Bạc Xỉu Muối", size: "S", price: 29000 },
  { name: "Bạc Xỉu Muối", size: "M", price: 36000 },
  { name: "Cold Brew", size: "S", price: 31000 },
  { name: "Cold Brew", size: "M", price: 38000 },
  { name: "Cold Brew Cam", size: "S", price: 41000 },
  { name: "Cold Brew Cam", size: "M", price: 48000 },
  { name: "Cold Brew Chanh Vàng", size: "S", price: 41000 },
  { name: "Cold Brew Chanh Vàng", size: "M", price: 48000 },
  { name: "Cold Brew Tonic", size: "S", price: 41000 },
  { name: "Cold Brew Tonic", size: "M", price: 48000 },
  { name: "Cold Brew Chai", size: null, price: 59000 },
  { name: "Cacao Latte", size: "M", price: 38000 },
  { name: "Cacao Muối", size: "M", price: 41000 },
  { name: "Matcha Latte", size: "M", price: 43000 },
  { name: "Matcha Cold Whisk", size: "M", price: 45000 },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  let changed = 0;

  for (const p of PRICES) {
    const where = and(
      eq(products.name, p.name),
      p.size === null ? isNull(products.sizeLabel) : eq(products.sizeLabel, p.size),
    );
    const rows = await db
      .select({ id: products.id, salePrice: products.salePrice })
      .from(products)
      .where(where);

    if (rows.length === 0) {
      console.warn(`! missing product: ${p.name} (${p.size ?? "—"})`);
      continue;
    }
    for (const row of rows) {
      if (row.salePrice === p.price) continue;
      console.log(
        `${dryRun ? "would update" : "updated"}  ${p.name} (${p.size ?? "—"})  ${row.salePrice} → ${p.price}`,
      );
      if (!dryRun) {
        await db.update(products).set({ salePrice: p.price }).where(eq(products.id, row.id));
      }
      changed++;
    }
  }

  console.log(
    changed === 0
      ? "Menu already in sync — nothing to change."
      : `${dryRun ? "Would change" : "Changed"} ${changed} price(s).`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
