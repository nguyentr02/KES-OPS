import { desc, inArray } from "drizzle-orm";
import { Plus, ReceiptText } from "lucide-react";
import Link from "next/link";

import { DeleteOrderButton } from "@/components/orders/delete-order-button";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { formatDateTime, formatVnd, paymentLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const recent = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(50);

  const ids = recent.map((o) => o.id);
  const items = ids.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, ids))
    : [];

  const byOrder = new Map<number, typeof items>();
  for (const it of items) {
    const list = byOrder.get(it.orderId);
    if (list) list.push(it);
    else byOrder.set(it.orderId, [it]);
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          Đơn hàng
        </h1>
        <Button render={<Link href="/orders/new" />} className="h-10">
          <Plus className="size-4" /> Đơn mới
        </Button>
      </div>

      {recent.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          Chưa có đơn nào. Nhấn <strong>Đơn mới</strong> để bắt đầu.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {recent.map((o) => {
            const lines = byOrder.get(o.id) ?? [];
            const profit = Math.round(o.revenueTotal - o.cogsTotal);
            const count = lines.reduce((s, l) => s + l.qty, 0);
            return (
              <div
                key={o.id}
                className="rounded-xl border border-border/60 bg-card p-4"
              >
                {/* Header: id + time, and actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="font-semibold">#{o.id}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(o.createdAt)}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {paymentLabel[o.paymentMethod] ?? o.paymentMethod}
                    </span>
                    {o.discountPercent > 0 && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        giảm {o.discountPercent}%
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      title="Biên lai"
                      className="text-muted-foreground"
                      render={<Link href={`/orders/${o.id}/receipt`} />}
                    >
                      <ReceiptText className="size-4" />
                    </Button>
                    <DeleteOrderButton id={o.id} />
                  </div>
                </div>

                {/* Items */}
                <ul className="mt-3 space-y-1.5">
                  {lines.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate">
                        {l.nameSnapshot}
                        {l.sizeSnapshot && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({l.sizeSnapshot})
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        ×{l.qty}
                      </span>
                    </li>
                  ))}
                </ul>

                {o.note && (
                  <div className="mt-2.5 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground italic">
                    {o.note}
                  </div>
                )}

                {/* Total */}
                <div className="mt-3 flex items-baseline justify-between border-t border-border/60 pt-3">
                  <span className="text-sm text-muted-foreground">
                    {count} món
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      lãi {formatVnd(profit)}
                    </span>
                    <span className="font-serif text-lg font-semibold tabular-nums">
                      {formatVnd(o.revenueTotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
