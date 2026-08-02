import { asc } from "drizzle-orm";

import { IngredientsTable } from "@/components/products/ingredients-table";
import { db } from "@/db";
import { ingredients } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function IngredientsPage() {
  const rows = await db.select().from(ingredients).orderBy(asc(ingredients.sort));
  return (
    <>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Giá nguyên liệu gốc. Sửa <strong>khối lượng</strong> và{" "}
        <strong>giá nhập</strong> — đơn giá và giá vốn từng món sẽ tự tính lại.
      </p>
      <IngredientsTable ingredients={rows} />
    </>
  );
}
