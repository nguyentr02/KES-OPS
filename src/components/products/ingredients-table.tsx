"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createIngredient,
  deleteIngredient,
  updateIngredient,
} from "@/app/(app)/products/nguyen-lieu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Ingredient } from "@/db/schema";
import { formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";

function toNumber(s: string): number | null {
  const t = s
    .trim()
    .replace(/[^\d.,]/g, "")
    .replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function IngredientsTable({
  ingredients,
}: {
  ingredients: Ingredient[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {adding ? (
        <NewRow onClose={() => setAdding(false)} />
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAdding(true)}
          className="h-9 gap-1 self-start"
        >
          <Plus className="size-4" />
          Thêm nguyên liệu
        </Button>
      )}

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        {ingredients.map((ing, i) => (
          <Row key={ing.id} ing={ing} first={i === 0} />
        ))}
      </div>
    </div>
  );
}

/** Name + unit + the two numbers, shared by the editor and the add form. */
function Fields({
  name,
  setName,
  unit,
  setUnit,
  pack,
  setPack,
  price,
  setPrice,
}: {
  name: string;
  setName: (v: string) => void;
  unit: string;
  setUnit: (v: string) => void;
  pack: string;
  setPack: (v: string) => void;
  price: string;
  setPrice: (v: string) => void;
}) {
  return (
    <>
      <div className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
          Tên
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex w-24 flex-col gap-1 text-xs text-muted-foreground">
          Đơn vị
          <Input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="g"
          />
        </label>
      </div>
      <div className="mt-2 flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
          Khối lượng ({unit || "đv"})
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
      </div>
    </>
  );
}

function NewRow({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("g");
  const [pack, setPack] = useState("");
  const [price, setPrice] = useState("");
  const [pending, startTransition] = useTransition();

  const packNum = toNumber(pack);
  const priceNum = toNumber(price);
  const valid =
    name.trim() !== "" &&
    unit.trim() !== "" &&
    packNum != null &&
    packNum > 0 &&
    priceNum != null;

  function save() {
    if (!valid) {
      toast.error("Cần tên, đơn vị, khối lượng > 0 và giá nhập.");
      return;
    }
    startTransition(async () => {
      await createIngredient({
        name: name.trim(),
        unit: unit.trim(),
        packSize: packNum,
        purchasePrice: priceNum,
      });
      toast.success(`Đã thêm ${name.trim()}.`);
      onClose();
    });
  }

  return (
    <div className="rounded-xl border border-primary/40 bg-card p-3">
      <div className="mb-2 text-sm font-medium">Nguyên liệu mới</div>
      <Fields
        name={name}
        setName={setName}
        unit={unit}
        setUnit={setUnit}
        pack={pack}
        setPack={setPack}
        price={price}
        setPrice={setPrice}
      />
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
          Huỷ
        </Button>
        <Button size="sm" onClick={save} disabled={!valid || pending}>
          {pending ? "Đang lưu…" : "Thêm"}
        </Button>
      </div>
    </div>
  );
}

function Row({ ing, first }: { ing: Ingredient; first: boolean }) {
  const [name, setName] = useState(ing.name);
  const [unit, setUnit] = useState(ing.unit);
  const [pack, setPack] = useState(String(ing.packSize));
  const [price, setPrice] = useState(String(ing.purchasePrice));
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const packNum = toNumber(pack);
  const priceNum = toNumber(price);
  const unitCost =
    packNum && packNum > 0 && priceNum != null ? priceNum / packNum : null;
  const dirty =
    name !== ing.name ||
    unit !== ing.unit ||
    packNum !== ing.packSize ||
    priceNum !== ing.purchasePrice;
  const valid =
    name.trim() !== "" &&
    unit.trim() !== "" &&
    packNum != null &&
    packNum > 0 &&
    priceNum != null;

  function save() {
    if (!valid) {
      toast.error("Số liệu không hợp lệ.");
      return;
    }
    startTransition(async () => {
      await updateIngredient({
        id: ing.id,
        name: name.trim(),
        unit: unit.trim(),
        packSize: packNum,
        purchasePrice: priceNum,
      });
      toast.success(`Đã lưu ${name.trim()}.`);
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteIngredient({ id: ing.id });
      if (res.ok) toast.success(`Đã xoá ${ing.name}.`);
      else toast.error(res.reason);
      setConfirming(false);
    });
  }

  return (
    <div className={cn("p-3", !first && "border-t border-border/60")}>
      <div className="mb-2 flex items-center justify-end gap-2">
        {confirming ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Xoá hẳn?</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              Không
            </Button>
            <Button
              size="sm"
              className="h-7 bg-destructive text-white hover:bg-destructive/90"
              onClick={remove}
              disabled={pending}
            >
              Xoá
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Xoá ${ing.name}`}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      <Fields
        name={name}
        setName={setName}
        unit={unit}
        setUnit={setUnit}
        pack={pack}
        setPack={setPack}
        price={price}
        setPrice={setPrice}
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold tabular-nums">
          {unitCost != null ? `${formatVnd(unitCost)}/${unit || "đv"}` : "—"}
        </div>
        <Button
          size="sm"
          onClick={save}
          disabled={!dirty || !valid || pending}
          className="h-8"
        >
          {pending ? "Đang lưu…" : "Lưu"}
        </Button>
      </div>
    </div>
  );
}
