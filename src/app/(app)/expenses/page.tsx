import { desc } from "drizzle-orm";

import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { formatVnd } from "@/lib/format";

export const dynamic = "force-dynamic";

function displayDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default async function ExpensesPage() {
  const rows = await db
    .select()
    .from(expenses)
    .orderBy(desc(expenses.spentOn), desc(expenses.createdAt))
    .limit(100);

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold tracking-tight">
        Chi phí
      </h1>
      <p className="mt-1 mb-5 max-w-2xl text-sm text-muted-foreground">
        Chỉ ghi <strong>chi phí vận hành</strong> — thuê mặt bằng, lương, điện
        nước… Tiền nguyên liệu đã tính trong giá vốn từng món, không ghi ở đây.
      </p>

      <ExpenseForm />

      <div className="mt-8">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold">Gần đây</h2>
          {rows.length > 0 && (
            <span className="text-sm text-muted-foreground tabular-nums">
              Tổng {formatVnd(total)}
            </span>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
            Chưa có chi phí nào.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
            {rows.map((r, i) => (
              <div
                key={r.id}
                className={
                  "flex items-center gap-3 p-3" +
                  (i > 0 ? " border-t border-border/60" : "")
                }
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {r.category}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {displayDate(r.spentOn)}
                    </span>
                  </div>
                  {r.note && (
                    <div className="mt-1 truncate text-sm text-muted-foreground">
                      {r.note}
                    </div>
                  )}
                </div>
                <div className="shrink-0 font-semibold tabular-nums">
                  {formatVnd(r.amount)}
                </div>
                <DeleteExpenseButton id={r.id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
