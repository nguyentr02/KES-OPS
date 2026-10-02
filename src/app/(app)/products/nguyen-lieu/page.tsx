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
        Giá nguyên liệu gốc. Thêm, sửa hoặc xoá ở đây — đơn giá, giá thành phẩm
        và giá vốn từng món sẽ tự tính lại. Nguyên liệu đang được dùng thì không
        xoá được.
      </p>
      <IngredientsTable ingredients={rows} />
    </>
  );
}
