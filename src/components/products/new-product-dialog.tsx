"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createProduct } from "@/app/(app)/products/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Which size rows to create. A drink's sizes are separate product rows. */
type SizeMode = "SM" | "M" | "ONE";

const SIZE_MODES: { value: SizeMode; label: string; hint: string }[] = [
  { value: "SM", label: "S và M", hint: "Hai size" },
  { value: "M", label: "Chỉ M", hint: "Một size, ghi là M" },
  { value: "ONE", label: "Không chia size", hint: "Ví dụ: chai" },
];

const NEW_CATEGORY = "__new__";

function toInt(s: string): number | null {
  const t = s.trim().replace(/[^\d]/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function NewProductDialog({ categories }: { categories: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 gap-1 self-start"
      >
        <Plus className="size-4" />
        Thêm món
      </Button>

      {open && (
        <Form categories={categories} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function Form({
  categories,
  onClose,
}: {
  categories: string[];
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [categoryKey, setCategoryKey] = useState(categories[0] ?? NEW_CATEGORY);
  const [newCategory, setNewCategory] = useState("");
  const [mode, setMode] = useState<SizeMode>("SM");
  const [priceS, setPriceS] = useState("");
  const [priceM, setPriceM] = useState("");
  const [pending, startTransition] = useTransition();

  const category =
    categoryKey === NEW_CATEGORY ? newCategory.trim() : categoryKey;
  const s = toInt(priceS);
  const m = toInt(priceM);

  // "SM" needs both prices; the other two need the single one, held in priceM.
  const sizes =
    mode === "SM"
      ? s != null && m != null && s > 0 && m > 0
        ? [
            { label: "S" as const, salePrice: s },
            { label: "M" as const, salePrice: m },
          ]
        : null
      : m != null && m > 0
        ? [{ label: mode === "M" ? ("M" as const) : null, salePrice: m }]
        : null;

  const valid = name.trim() !== "" && category !== "" && sizes != null;

  const labels: Record<string, string> = Object.fromEntries([
    ...categories.map((c) => [c, c]),
    [NEW_CATEGORY, "Danh mục mới…"],
  ]);

  function save() {
    if (!valid) {
      toast.error("Cần tên món, danh mục và giá bán.");
      return;
    }
    startTransition(async () => {
      const res = await createProduct({
        name: name.trim(),
        category,
        sizes: sizes!,
      });
      if (!res.ok) {
        toast.error(res.reason);
        return;
      }
      toast.success(`Đã thêm ${name.trim()}.`);
      onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm món mới</DialogTitle>
          <DialogDescription>
            Giá vốn tính từ công thức — thêm món xong thì mở Công thức để nhập
            nguyên liệu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Tên món
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Cà Phê Dừa"
            />
          </label>

          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            Danh mục
            <Select
              items={labels}
              value={categoryKey}
              onValueChange={(v) => setCategoryKey(String(v))}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Chọn danh mục" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_CATEGORY}>Danh mục mới…</SelectItem>
              </SelectContent>
            </Select>
            {categoryKey === NEW_CATEGORY && (
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Tên danh mục mới"
                aria-label="Tên danh mục mới"
                className="mt-1"
              />
            )}
          </div>

          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            Size
            <div className="flex gap-1.5">
              {SIZE_MODES.map((sm) => (
                <button
                  key={sm.value}
                  type="button"
                  onClick={() => setMode(sm.value)}
                  title={sm.hint}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                    mode === sm.value
                      ? "border-primary bg-primary/12 text-primary"
                      : "border-input text-muted-foreground hover:bg-muted",
                  )}
                >
                  {sm.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end gap-2">
            {mode === "SM" && (
              <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                Giá bán S (₫)
                <Input
                  inputMode="numeric"
                  value={priceS}
                  onChange={(e) => setPriceS(e.target.value)}
                  className="tabular-nums"
                />
              </label>
            )}
            <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
              {mode === "SM" ? "Giá bán M (₫)" : "Giá bán (₫)"}
              <Input
                inputMode="numeric"
                value={priceM}
                onChange={(e) => setPriceM(e.target.value)}
                className="tabular-nums"
              />
            </label>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Huỷ
          </Button>
          <Button size="sm" onClick={save} disabled={!valid || pending}>
            {pending ? "Đang thêm…" : "Thêm món"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
