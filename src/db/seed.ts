import bcrypt from "bcryptjs";
import { config } from "dotenv";

import { db } from "./index";
import { products, users } from "./schema";

// db is lazy (connects on first query), so loading env here — before main()
// runs any query — is enough; no need to defer the imports.
config({ path: ".env.local" });

/**
 * The single shared staff login. No public registration — this is the only
 * account; everyone at the cafe uses it together.
 */
const STAFF: { username: string; name: string; password: string }[] = [
  { username: "kescafe2026", name: "KES Cafe", password: "Kes2026@" },
];

/** Sellable SKUs, mirrored from the website menu (cost/giá vốn set later in-app). */
const MENU: {
  category: string;
  name: string;
  sizes: { label: string | null; price: number }[];
}[] = [
  {
    category: "Cà Phê",
    name: "Cà Phê Đen",
    sizes: [
      { label: "S", price: 21000 },
      { label: "M", price: 26000 },
    ],
  },
  {
    category: "Cà Phê",
    name: "Cà Phê Sữa SG",
    sizes: [
      { label: "S", price: 23000 },
      { label: "M", price: 28000 },
    ],
  },
  {
    category: "Cà Phê",
    name: "Cà Phê Muối",
    sizes: [
      { label: "S", price: 27000 },
      { label: "M", price: 34000 },
    ],
  },
  {
    category: "Cà Phê",
    name: "Cà Phê Kem Bơ Đậu Phộng",
    sizes: [
      { label: "S", price: 29000 },
      { label: "M", price: 36000 },
    ],
  },
  {
    category: "Cà Phê",
    name: "Bạc Xỉu",
    sizes: [
      { label: "S", price: 27000 },
      { label: "M", price: 31000 },
    ],
  },
  {
    category: "Cà Phê",
    name: "Bạc Xỉu Muối",
    sizes: [
      { label: "S", price: 29000 },
      { label: "M", price: 36000 },
    ],
  },
  {
    category: "Cold Brew",
    name: "Cold Brew",
    sizes: [
      { label: "S", price: 31000 },
      { label: "M", price: 38000 },
    ],
  },
  {
    category: "Cold Brew",
    name: "Cold Brew Chai",
    sizes: [{ label: null, price: 59000 }],
  },
  {
    category: "Cold Brew",
    name: "Cold Brew Chanh Vàng",
    sizes: [
      { label: "S", price: 41000 },
      { label: "M", price: 48000 },
    ],
  },
  {
    category: "Cold Brew",
    name: "Cold Brew Cam",
    sizes: [
      { label: "S", price: 41000 },
      { label: "M", price: 48000 },
    ],
  },
  {
    category: "Cold Brew",
    name: "Cold Brew Tonic",
    sizes: [
      { label: "S", price: 41000 },
      { label: "M", price: 48000 },
    ],
  },
  {
    category: "Trà Macchiato",
    name: "Trà Chanh Vàng Macchiato",
    sizes: [
      { label: "S", price: 31000 },
      { label: "M", price: 38000 },
    ],
  },
];

async function main() {
  // Users — insert if the username isn't already taken (idempotent).
  for (const s of STAFF) {
    const passwordHash = await bcrypt.hash(s.password, 10);
    await db
      .insert(users)
      .values({ username: s.username, name: s.name, passwordHash })
      .onConflictDoNothing({ target: users.username });
  }
  console.log(`Seeded ${STAFF.length} user(s).`);

  // Products — only when empty, so re-running never clobbers cost/price edits.
  const existing = await db.select({ id: products.id }).from(products).limit(1);
  if (existing.length > 0) {
    console.log("Products already present — skipping product seed.");
    return;
  }

  const rows = MENU.flatMap((drink, di) =>
    drink.sizes.map((size, si) => ({
      category: drink.category,
      name: drink.name,
      sizeLabel: size.label,
      salePrice: size.price,
      sort: di * 10 + si,
    })),
  );
  await db.insert(products).values(rows);
  console.log(`Seeded ${rows.length} products.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
