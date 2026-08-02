import { and, eq, isNull } from "drizzle-orm";
import { config } from "dotenv";

import { db } from "./index";
import { products } from "./schema";

config({ path: ".env.local" });

/**
 * One-off: import the computed giá vốn (cost) from the accounting workbook's
 * "Cost" sheet (docs/ketoan) into products. Matched by name + size.
 * Safe to re-run — it just overwrites costPrice with these values.
 */
// Exact "Cost" values from the workbook (docs/ketoan), kept un-rounded.
const COSTS: { name: string; size: "S" | "M" | null; cost: number }[] = [
  { name: "Cà Phê Đen", size: "S", cost: 3710.8 },
  { name: "Cà Phê Đen", size: "M", cost: 4881.4 },
  { name: "Cà Phê Sữa SG", size: "S", cost: 5071.05974 },
  { name: "Cà Phê Sữa SG", size: "M", cost: 6608.412987 },
  { name: "Cà Phê Muối", size: "S", cost: 6633.104515 },
  { name: "Cà Phê Muối", size: "M", cost: 9407.123768 },
  { name: "Cà Phê Kem Bơ Đậu Phộng", size: "S", cost: 9457.653862 },
  { name: "Cà Phê Kem Bơ Đậu Phộng", size: "M", cost: 13034.48079 },
  { name: "Bạc Xỉu", size: "S", cost: 6145.45974 },
  { name: "Bạc Xỉu", size: "M", cost: 8410.012987 },
  { name: "Bạc Xỉu Muối", size: "S", cost: 8617.057761 },
  { name: "Bạc Xỉu Muối", size: "M", cost: 11705.47702 },
  { name: "Cold Brew", size: "S", cost: 6577.371429 },
  { name: "Cold Brew", size: "M", cost: 8738.745055 },
  { name: "Cold Brew Chai", size: null, cost: 16064.04396 },
  { name: "Cold Brew Chanh Vàng", size: "S", cost: 8495.371429 },
  { name: "Cold Brew Chanh Vàng", size: "M", cost: 11615.74505 },
  { name: "Cold Brew Cam", size: "S", cost: 10739.54725 },
  { name: "Cold Brew Cam", size: "M", cost: 14265.92088 },
  { name: "Cold Brew Tonic", size: "S", cost: 9702.547253 },
  { name: "Cold Brew Tonic", size: "M", cost: 14010.42088 },
  { name: "Trà Chanh Vàng Macchiato", size: "S", cost: 7536.371429 },
  { name: "Trà Chanh Vàng Macchiato", size: "M", cost: 10656.74505 },
];

async function main() {
  let updated = 0;
  for (const c of COSTS) {
    const res = await db
      .update(products)
      .set({ costPrice: c.cost })
      .where(
        and(
          eq(products.name, c.name),
          c.size === null
            ? isNull(products.sizeLabel)
            : eq(products.sizeLabel, c.size),
        ),
      )
      .returning({ id: products.id });
    if (res.length) updated += res.length;
    else console.warn(`No match: ${c.name} (${c.size ?? "—"})`);
  }
  console.log(`Updated cost on ${updated}/${COSTS.length} products.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
