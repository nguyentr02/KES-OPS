"use client";

import { ChevronDown } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateProduct } from "@/app/(app)/products/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product } from "@/db/schema";
import { formatPercent, formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";

type RecipeLine = { label: string; qty: number; lineCost: number };
type Item = Product & { recipe: RecipeLine[] };
type Group = { category: string; items: Item[] };

export function ProductsManager({ groups }: { groups: Group[] }) {
  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.category}>
          <h2 className="mb-2 font-serif text-lg font-semibold">
            {group.category}
          </h2>
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
            {group.items.map((p, i) => (
              <ProductRow key={p.id} product={p} first={i === 0} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function toInt(s: string): number | null {
  const t = s.trim().replace(/[^\d]/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function ProductRow({ product, first }: { product: Item; first: boolean }) {
  const [sale, setSale] = useState(String(product.salePrice));
  const [active, setActive] = useState(product.active);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const saleNum = toInt(sale);
  const cost = product.costPrice; // computed giá vốn (read-only)
  const dirty = saleNum !== product.salePrice || active !== product.active;
  const margin =
    saleNum && saleNum > 0 && cost != null ? (saleNum - cost) / saleNum : null;

  function save() {
    if (saleNum == null) {
      toast.error("Giá bán không hợp lệ.");
      return;
    }
    startTransition(async () => {
      await updateProduct({ id: product.id, salePrice: saleNum, active });
      toast.success(`Đã lưu ${product.name}.`);
    });
  }

  return (
    <div className={cn("p-3", !first && "border-t border-border/60", !active && "opacity-60")}>
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium">
          {product.name}
          {product.sizeLabel && (
            <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {product.sizeLabel}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setActive((a) => !a)}
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
            active ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {active ? "Đang bán" : "Đã ẩn"}
        </button>
      </div>

      <div className="mt-2.5 flex items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Giá bán
          <Input
            inputMode="numeric"
            value={sale}
            onChange={(e) => setSale(e.target.value)}
            className="h-9 w-28 tabular-nums"
          />
        </label>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          Giá vốn
          <div className="flex h-9 items-center font-semibold tabular-nums">
            {cost != null ? formatVnd(cost) : "—"}
          </div>
        </div>
        <div className="ml-auto flex flex-col items-end gap-1 text-xs text-muted-foreground">
          Biên
          <div className="flex h-9 items-center font-semibold tabular-nums">
            {margin != null ? formatPercent(margin) : "—"}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          Công thức ({product.recipe.length})
        </button>
        <Button size="sm" onClick={save} disabled={!dirty || pending} className="h-8">
          {pending ? "Đang lưu…" : "Lưu"}
        </Button>
      </div>

      {open && (
        <ul className="mt-2 space-y-1 border-t border-border/60 pt-2 text-sm">
          {product.recipe.length === 0 ? (
            <li className="text-muted-foreground">Chưa có công thức.</li>
          ) : (
            product.recipe.map((l, i) => (
              <li key={i} className="flex justify-between gap-2 text-muted-foreground">
                <span>
                  {l.label} × {l.qty}
                </span>
                <span className="tabular-nums">{formatVnd(l.lineCost)}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
