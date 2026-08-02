import { and, desc, gte, lte } from "drizzle-orm";
import Link from "next/link";

import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { db } from "@/db";
import { type Expense, expenses } from "@/db/schema";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";
import { formatVnd } from "@/lib/format";
import { computePeriod } from "@/lib/period";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function displayDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

type Range = "week" | "month";
const RANGES: { key: Range; label: string }[] = [
  { key: "week", label: "7 ngày" },
  { key: "month", label: "1 tháng" },
];

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range: Range = sp.range === "month" ? "month" : "week";
  const period = computePeriod(range);

  const rows = await db
    .select()
    .from(expenses)
    .where(
      and(
        gte(expenses.spentOn, period.startDateStr),
        lte(expenses.spentOn, period.endDateStr),
      ),
    )
    .orderBy(desc(expenses.spentOn), desc(expenses.createdAt));

  // Left: group by day (rows already sorted newest day first).
  const dayGroups: { date: string; total: number; items: Expense[] }[] = [];
  for (const r of rows) {
    let g = dayGroups.find((x) => x.date === r.spentOn);
    if (!g) {
      g = { date: r.spentOn, total: 0, items: [] };
      dayGroups.push(g);
    }
    g.total += r.amount;
    g.items.push(r);
  }

  // Right: period total + breakdown by category.
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const byCat = new Map<string, number>();
  for (const r of rows) byCat.set(r.category, (byCat.get(r.category) ?? 0) + r.amount);
  const catBreakdown = EXPENSE_CATEGORIES.map((c) => ({
    category: c,
    amount: byCat.get(c) ?? 0,
  })).filter((c) => c.amount > 0);

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

      <div className="mt-8 flex flex-col gap-6 lg:flex-row">
        {/* Left: expenses by day */}
        <div className="order-2 flex-1 lg:order-1">
          <h2 className="mb-2 font-serif text-lg font-semibold">
            Chi phí theo ngày
          </h2>
          {dayGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
              Chưa có chi phí trong kỳ này.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {dayGroups.map((day) => (
                <div key={day.date}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">
                      {displayDate(day.date)}
                    </span>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {formatVnd(day.total)}
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
                    {day.items.map((r, i) => (
                      <div
                        key={r.id}
                        className={cn(
                          "flex items-center gap-3 p-3",
                          i > 0 && "border-t border-border/60",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {r.category}
                          </span>
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: period toggle + summary */}
        <aside className="order-1 lg:order-2 lg:w-72 lg:shrink-0">
          <div className="mb-3 inline-flex rounded-lg border border-border/60 bg-card p-1">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/expenses?range=${r.key}`}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  r.key === range
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </Link>
            ))}
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="text-sm text-muted-foreground">
              Tổng chi phí ({RANGES.find((r) => r.key === range)!.label})
            </div>
            <div className="mt-1 font-serif text-2xl font-semibold tabular-nums">
              {formatVnd(total)}
            </div>

            {catBreakdown.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
                {catBreakdown.map((c) => (
                  <div
                    key={c.category}
                    className="flex items-baseline justify-between gap-2 text-sm"
                  >
                    <span className="text-muted-foreground">{c.category}</span>
                    <span className="tabular-nums">{formatVnd(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
