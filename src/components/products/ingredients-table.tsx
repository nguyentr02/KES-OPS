"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateIngredient } from "@/app/(app)/products/nguyen-lieu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Ingredient } from "@/db/schema";
import { formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";

function toNumber(s: string): number | null {
  const t = s.trim().replace(/[^\d.,]/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function IngredientsTable({ ingredients }: { ingredients: Ingredient[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      {ingredients.map((ing, i) => (
        <Row key={ing.id} ing={ing} first={i === 0} />
      ))}
    </div>
  );
}

function Row({ ing, first }: { ing: Ingredient; first: boolean }) {
  const [pack, setPack] = useState(String(ing.packSize));
  const [price, setPrice] = useState(String(ing.purchasePrice));
  const [pending, startTransition] = useTransition();

  const packNum = toNumber(pack);
  const priceNum = toNumber(price);
  const unit = packNum && packNum > 0 && priceNum != null ? priceNum / packNum : null;
  const dirty = packNum !== ing.packSize || priceNum !== ing.purchasePrice;

  function save() {
    if (!packNum || packNum <= 0 || priceNum == null) {
      toast.error("Số liệu không hợp lệ.");
      return;
    }
    startTransition(async () => {
      await updateIngredient({ id: ing.id, packSize: packNum, purchasePrice: priceNum });
      toast.success(`Đã lưu ${ing.name}.`);
    });
  }

  return (
    <div className={cn("p-3", !first && "border-t border-border/60")}>
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium">{ing.name}</div>
        <div className="text-sm text-muted-foreground tabular-nums">
          {unit != null ? `${formatVnd(unit)}/${ing.unit}` : "—"}
        </div>
      </div>
      <div className="mt-2.5 flex items-end gap-3">
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
          Khối lượng ({ing.unit})
          <Input
            inputMode="decimal"
            value={pack}
            onChange={(e) => setPack(e.target.value)}
            className="tabular-nums"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
          Giá nhập (₫)
          <Input
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="tabular-nums"
          />
        </label>
        <Button size="sm" onClick={save} disabled={!dirty || pending} className="h-9">
          {pending ? "…" : "Lưu"}
        </Button>
      </div>
    </div>
  );
}
