"use client";

import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { saveRecipe, updateProduct } from "@/app/(app)/products/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product } from "@/db/schema";
import { formatPercent, formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";

/** An ingredient or component that a recipe line can point at. */
export type CatalogRef = {
  /** "ingredient:12" / "component:3" — the value held by the <Select>. */
  key: string;
  refType: "ingredient" | "component";
  refId: number;
  name: string;
  unit: string;
  unitCost: number;
};

type RecipeLine = { key: string; qty: number };
type Item = Product & { recipe: RecipeLine[] };
type Group = { category: string; items: Item[] };

/** Catalog in the shapes the rows need, built once for the whole page. */
type Catalog = {
  refs: CatalogRef[];
  byKey: Map<string, CatalogRef>;
  /** <Select items> — lets SelectValue show the name instead of the raw key. */
  labels: Record<string, string>;
  components: CatalogRef[];
  ingredients: CatalogRef[];
};

export function ProductsManager({
  groups,
  catalog,
}: {
  groups: Group[];
  catalog: CatalogRef[];
}) {
  const cat: Catalog = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const c of catalog) labels[c.key] = c.name;
    return {
      refs: catalog,
      byKey: new Map(catalog.map((c) => [c.key, c])),
      labels,
      components: catalog.filter((c) => c.refType === "component"),
      ingredients: catalog.filter((c) => c.refType === "ingredient"),
    };
  }, [catalog]);

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.category}>
          <h2 className="mb-2 font-serif text-lg font-semibold">
            {group.category}
          </h2>
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
            {group.items.map((p, i) => (
              <ProductRow
                key={p.id}
                product={p}
                catalog={cat}
                first={i === 0}
              />
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

/** Quantities are measures (40 ml, 1,5 g), so they allow decimals. */
function toQty(s: string): number | null {
  const t = s
    .trim()
    .replace(/[^\d.,]/g, "")
    .replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Order-sensitive fingerprint of a recipe, for the dirty check. */
function serialize(lines: RecipeLine[]): string {
  return lines.map((l) => `${l.key}x${l.qty}`).join("|");
}

type DraftLine = { uid: number; key: string | null; qty: string };

let nextUid = 0;

/**
 * The row owns the recipe draft as well as the price fields. Keeping it here
 * rather than inside RecipeEditor is what lets giá vốn and biên above track an
 * unsaved edit — a child cannot set a parent's state while rendering.
 */
function ProductRow({
  product,
  catalog,
  first,
}: {
  product: Item;
  catalog: Catalog;
  first: boolean;
}) {
  const [sale, setSale] = useState(String(product.salePrice));
  const [active, setActive] = useState(product.active);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [lines, setLines] = useState<DraftLine[]>(() =>
    product.recipe.map((l) => ({ uid: nextUid++, key: l.key, qty: String(l.qty) })),
  );
  const [savedFp, setSavedFp] = useState(() => serialize(product.recipe));
  const [savedCount, setSavedCount] = useState(product.recipe.length);
  const [recipePending, startRecipeTransition] = useTransition();

  // `qty` stays the raw input string; `qtyNum` is it parsed.
  const priced = lines.map((l) => {
    const ref = l.key ? catalog.byKey.get(l.key) : undefined;
    const qtyNum = toQty(l.qty);
    const valid = ref != null && qtyNum != null && qtyNum > 0;
    return { ...l, ref, qtyNum, valid, cost: valid ? ref.unitCost * qtyNum : null };
  });
  const complete = priced.every((l) => l.valid);
  const recipeTotal = complete
    ? priced.reduce((s, l) => s + (l.cost ?? 0), 0)
    : null;
  const recipeFp = serialize(
    priced
      .filter((l) => l.valid)
      .map((l) => ({ key: l.key as string, qty: l.qtyNum as number })),
  );
  const recipeDirty = recipeFp !== savedFp;

  const saleNum = toInt(sale);
  // While the editor is open and valid, preview the cost the recipe implies.
  const cost =
    open && complete && lines.length > 0 ? recipeTotal : product.costPrice;
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

  function saveRecipeLines() {
    if (!complete) {
      toast.error("Mỗi dòng cần chọn thành phần và định lượng lớn hơn 0.");
      return;
    }
    const payload = priced.map((l) => ({
      refType: l.ref!.refType,
      refId: l.ref!.refId,
      qty: l.qtyNum!,
    }));
    startRecipeTransition(async () => {
      await saveRecipe({ productId: product.id, lines: payload });
      setSavedFp(recipeFp);
      setSavedCount(payload.length);
      toast.success(`Đã lưu công thức ${product.name}.`);
    });
  }

  return (
    <div
      className={cn(
        "p-3",
        !first && "border-t border-border/60",
        !active && "opacity-60",
      )}
    >
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
            active
              ? "bg-primary/12 text-primary"
              : "bg-muted text-muted-foreground",
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
          <div
            className={cn(
              "flex h-9 items-center font-semibold tabular-nums",
              open && recipeDirty && "text-primary",
            )}
          >
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
          <ChevronDown
            className={cn("size-3.5 transition-transform", open && "rotate-180")}
          />
          Công thức ({savedCount})
          {recipeDirty && <span className="text-primary">•</span>}
        </button>
        <Button
          size="sm"
          onClick={save}
          disabled={!dirty || pending}
          className="h-8"
        >
          {pending ? "Đang lưu…" : "Lưu"}
        </Button>
      </div>

      {open && (
        <RecipeEditor
          lines={priced}
          catalog={catalog}
          total={recipeTotal}
          canSave={recipeDirty && complete && !recipePending}
          pending={recipePending}
          onChange={(uid, patch) =>
            setLines((ls) => ls.map((l) => (l.uid === uid ? { ...l, ...patch } : l)))
          }
          onRemove={(uid) => setLines((ls) => ls.filter((l) => l.uid !== uid))}
          onAdd={() =>
            setLines((ls) => [...ls, { uid: nextUid++, key: null, qty: "" }])
          }
          onSave={saveRecipeLines}
        />
      )}
    </div>
  );
}

type PricedLine = DraftLine & {
  ref: CatalogRef | undefined;
  qtyNum: number | null;
  valid: boolean;
  cost: number | null;
};

/** Presentational — all recipe state lives in ProductRow. */
function RecipeEditor({
  lines,
  catalog,
  total,
  canSave,
  pending,
  onChange,
  onRemove,
  onAdd,
  onSave,
}: {
  lines: PricedLine[];
  catalog: Catalog;
  total: number | null;
  canSave: boolean;
  pending: boolean;
  onChange: (uid: number, patch: Partial<DraftLine>) => void;
  onRemove: (uid: number) => void;
  onAdd: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-2 space-y-2 border-t border-border/60 pt-2.5">
      {lines.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Chưa có công thức — thêm thành phần để tính giá vốn.
        </p>
      )}

      {lines.map((l) => (
        <div key={l.uid} className="flex items-center gap-1.5">
          <Select
            items={catalog.labels}
            value={l.key ?? ""}
            onValueChange={(v) => onChange(l.uid, { key: String(v) })}
          >
            <SelectTrigger className="h-9 min-w-0 flex-1">
              <SelectValue placeholder="Chọn thành phần" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Thành phẩm</SelectLabel>
                {catalog.components.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Nguyên liệu</SelectLabel>
                {catalog.ingredients.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Input
            inputMode="decimal"
            value={l.qty}
            onChange={(e) => onChange(l.uid, { qty: e.target.value })}
            placeholder="0"
            aria-label="Định lượng"
            className="h-9 w-16 shrink-0 tabular-nums"
          />
          <span className="w-9 shrink-0 truncate text-xs text-muted-foreground">
            {l.ref?.unit ?? ""}
          </span>
          <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {l.cost != null ? formatVnd(l.cost) : "—"}
          </span>
          <button
            type="button"
            onClick={() => onRemove(l.uid)}
            aria-label={`Xoá ${l.ref?.name ?? "dòng"}`}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <Button
          size="sm"
          variant="outline"
          onClick={onAdd}
          className="h-8 gap-1 text-xs"
        >
          <Plus className="size-3.5" />
          Thêm thành phần
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Giá vốn{" "}
            <strong className="font-semibold tabular-nums text-foreground">
              {total != null ? formatVnd(total) : "—"}
            </strong>
          </span>
          <Button
            size="sm"
            onClick={onSave}
            disabled={!canSave}
            className="h-8"
          >
            {pending ? "Đang lưu…" : "Lưu công thức"}
          </Button>
        </div>
      </div>
    </div>
  );
}
