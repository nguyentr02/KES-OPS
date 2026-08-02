import { desc, inArray } from "drizzle-orm";
import { Plus } from "lucide-react";
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
            const summary = lines
              .map(
                (l) =>
                  `${l.nameSnapshot}${l.sizeSnapshot ? ` (${l.sizeSnapshot})` : ""} ×${l.qty}`,
              )
              .join(", ");
            const profit = o.revenueTotal - o.cogsTotal;
            return (
              <div
                key={o.id}
                className="rounded-xl border border-border/60 bg-card p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">
                      #{o.id} · {formatDateTime(o.createdAt)} ·{" "}
                      {paymentLabel[o.paymentMethod] ?? o.paymentMethod}
                      {o.discountPercent > 0 && ` · giảm ${o.discountPercent}%`}
                    </div>
                    <div className="mt-1 text-sm">{summary || "—"}</div>
                    {o.note && (
                      <div className="mt-1 text-xs text-muted-foreground italic">
                        {o.note}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-start gap-1">
                    <div className="text-right">
                      <div className="font-semibold tabular-nums">
                        {formatVnd(o.revenueTotal)}
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        lãi {formatVnd(profit)}
                      </div>
                    </div>
                    <DeleteOrderButton id={o.id} />
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
