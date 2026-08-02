import { and, desc, gte, inArray, lt, lte } from "drizzle-orm";
import Link from "next/link";

import { DateFilter } from "@/components/dashboard/date-filter";
import { db } from "@/db";
import { expenses, orderItems, orders } from "@/db/schema";
import { formatVnd } from "@/lib/format";
import {
  computeDay,
  computePeriod,
  PERIODS,
  type PeriodKey,
  vnDateStr,
} from "@/lib/period";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function isPeriodKey(v: string | undefined): v is PeriodKey {
  return v === "today" || v === "week" || v === "month";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; date?: string }>;
}) {
  const sp = await searchParams;
  // A specific ?date=YYYY-MM-DD wins over the period tabs.
  const dateParam =
    typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date)
      ? sp.date
      : null;
  const period: PeriodKey | null = dateParam
    ? null
    : isPeriodKey(sp.period)
      ? sp.period
      : "today";
  const range = dateParam ? computeDay(dateParam) : computePeriod(period!);

  const orderRows = await db
    .select({
      id: orders.id,
      createdAt: orders.createdAt,
      revenueTotal: orders.revenueTotal,
      cogsTotal: orders.cogsTotal,
    })
    .from(orders)
    .where(
      and(gte(orders.createdAt, range.startUtc), lt(orders.createdAt, range.endUtc)),
    );

  const expenseRows = await db
    .select({ spentOn: expenses.spentOn, amount: expenses.amount })
    .from(expenses)
    .where(
      and(
        gte(expenses.spentOn, range.startDateStr),
        lte(expenses.spentOn, range.endDateStr),
      ),
    );

  const revenue = orderRows.reduce((s, o) => s + o.revenueTotal, 0);
  const cogs = orderRows.reduce((s, o) => s + o.cogsTotal, 0);
  const gross = revenue - cogs;
  const overhead = expenseRows.reduce((s, e) => s + e.amount, 0);
  const net = gross - overhead;

  // Revenue per VN day for the chart.
  const revByDay = new Map<string, number>();
  for (const o of orderRows) {
    const key = vnDateStr(o.createdAt);
    revByDay.set(key, (revByDay.get(key) ?? 0) + o.revenueTotal);
  }
  const chart = range.buckets.map((b) => ({
    label: b.label,
    value: revByDay.get(b.dateStr) ?? 0,
  }));
  const maxRev = Math.max(1, ...chart.map((c) => c.value));

  // Top drinks by quantity.
  const ids = orderRows.map((o) => o.id);
  const items = ids.length
    ? await db
        .select({
          name: orderItems.nameSnapshot,
          size: orderItems.sizeSnapshot,
          qty: orderItems.qty,
          lineSale: orderItems.lineSale,
        })
        .from(orderItems)
        .where(inArray(orderItems.orderId, ids))
    : [];
  const topMap = new Map<string, { name: string; size: string | null; qty: number; revenue: number }>();
  for (const it of items) {
    const key = `${it.name}__${it.size ?? ""}`;
    const cur = topMap.get(key) ?? {
      name: it.name,
      size: it.size,
      qty: 0,
      revenue: 0,
    };
    cur.qty += it.qty;
    cur.revenue += it.lineSale;
    topMap.set(key, cur);
  }
  const topDrinks = [...topMap.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const showChart = range.buckets.length > 1;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold tracking-tight">
        Tổng quan
      </h1>

      {/* Period tabs + single-day picker */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-border/60 bg-card p-1">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/?period=${p.key}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                p.key === period
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <DateFilter value={dateParam} />
      </div>

      {/* Net profit — the headline */}
      <div className="mt-4 rounded-2xl border border-border/60 bg-card p-5">
        <div className="text-sm text-muted-foreground">Lợi nhuận ròng</div>
        <div
          className={cn(
            "mt-1 font-serif text-4xl font-semibold tabular-nums",
            net >= 0 ? "text-primary" : "text-destructive",
          )}
        >
          {formatVnd(net)}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {orderRows.length} đơn · doanh thu {formatVnd(revenue)}
        </div>
      </div>

      {/* Breakdown */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Metric label="Doanh thu" value={revenue} />
        <Metric label="Giá vốn (COGS)" value={cogs} muted />
        <Metric label="Lợi nhuận gộp" value={gross} />
        <Metric label="Chi phí vận hành" value={overhead} muted />
      </div>

      {/* Revenue chart */}
      {showChart && (
        <div className="mt-6 rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-3 text-sm font-medium">Doanh thu theo ngày</div>
          <div className="flex h-40 items-end gap-1.5">
            {chart.map((c, i) => (
              <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="flex h-32 w-full items-end">
                  <div
                    className="w-full rounded-t bg-primary/70"
                    style={{ height: `${(c.value / maxRev) * 100}%` }}
                    title={formatVnd(c.value)}
                  />
                </div>
                <div className="w-full truncate text-center text-[10px] text-muted-foreground">
                  {c.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top drinks */}
      <div className="mt-6">
        <h2 className="mb-2 font-serif text-lg font-semibold">Bán chạy</h2>
        {topDrinks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Chưa có đơn nào trong kỳ này.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
            {topDrinks.map((d, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center justify-between gap-3 p-3",
                  i > 0 && "border-t border-border/60",
                )}
              >
                <div className="min-w-0">
                  <span className="font-medium">{d.name}</span>
                  {d.size && (
                    <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {d.size}
                    </span>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-semibold tabular-nums">×{d.qty}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {formatVnd(d.revenue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 font-semibold tabular-nums",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {formatVnd(value)}
      </div>
    </div>
  );
}
