"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createComponent,
  deleteComponent,
  updateComponent,
} from "@/app/(app)/products/thanh-pham/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";

/** An ingredient a component line can point at, with its unit price. */
export type IngredientRef = {
  id: number;
  name: string;
  unit: string;
  unitCost: number;
};

export type ComponentView = {
  id: number;
  name: string;
  unit: string;
  yieldQty: number;
  lines: { ingredientId: number; qty: number }[];
};

type DraftLine = { uid: number; ingredientId: number | null; qty: string };

let nextUid = 0;

function toNumber(s: string): number | null {
  const t = s
    .trim()
    .replace(/[^\d.,]/g, "")
    .replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function serialize(lines: { ingredientId: number; qty: number }[]): string {
  return lines.map((l) => `${l.ingredientId}x${l.qty}`).join("|");
}

export function ComponentsManager({
  components,
  ingredients,
}: {
  components: ComponentView[];
  ingredients: IngredientRef[];
}) {
  const [adding, setAdding] = useState(false);
  const byId = useMemo(
    () => new Map(ingredients.map((i) => [i.id, i])),
    [ingredients],
  );
  const labels = useMemo(() => {
    const m: Record<string, string> = {};
    for (const i of ingredients) m[String(i.id)] = i.name;
    return m;
  }, [ingredients]);

  return (
    <div className="flex flex-col gap-3">
      {adding ? (
        <ComponentCard
          key="new"
          ingredients={ingredients}
          byId={byId}
          labels={labels}
          onClose={() => setAdding(false)}
        />
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAdding(true)}
          className="h-9 gap-1 self-start"
        >
          <Plus className="size-4" />
          Thêm thành phẩm
        </Button>
      )}

      {components.map((c) => (
        <ComponentCard
          key={c.id}
          component={c}
          ingredients={ingredients}
          byId={byId}
          labels={labels}
        />
      ))}
    </div>
  );
}

/** One card — editing an existing component, or creating one when `component` is absent. */
function ComponentCard({
  component,
  ingredients,
  byId,
  labels,
  onClose,
}: {
  component?: ComponentView;
  ingredients: IngredientRef[];
  byId: Map<number, IngredientRef>;
  labels: Record<string, string>;
  onClose?: () => void;
}) {
  const isNew = component == null;

  const [name, setName] = useState(component?.name ?? "");
  const [unit, setUnit] = useState(component?.unit ?? "ml");
  const [yieldQty, setYieldQty] = useState(
    component ? String(component.yieldQty) : "",
  );
  const [lines, setLines] = useState<DraftLine[]>(() =>
    (component?.lines ?? []).map((l) => ({
      uid: nextUid++,
      ingredientId: l.ingredientId,
      qty: String(l.qty),
    })),
  );
  const [savedFp, setSavedFp] = useState(() =>
    serialize(component?.lines ?? []),
  );
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const priced = lines.map((l) => {
    const ing = l.ingredientId != null ? byId.get(l.ingredientId) : undefined;
    const qtyNum = toNumber(l.qty);
    const valid = ing != null && qtyNum != null && qtyNum > 0;
    return { ...l, ing, qtyNum, valid, cost: valid ? ing.unitCost * qtyNum : null };
  });
  const linesComplete = priced.every((l) => l.valid);
  const batchCost = linesComplete
    ? priced.reduce((s, l) => s + (l.cost ?? 0), 0)
    : null;
  const yieldNum = toNumber(yieldQty);
  const unitCost =
    batchCost != null && yieldNum != null && yieldNum > 0
      ? batchCost / yieldNum
      : null;

  const valid =
    name.trim() !== "" &&
    unit.trim() !== "" &&
    yieldNum != null &&
    yieldNum > 0 &&
    linesComplete;

  const linesFp = serialize(
    priced
      .filter((l) => l.valid)
      .map((l) => ({ ingredientId: l.ingredientId as number, qty: l.qtyNum as number })),
  );
  const dirty =
    isNew ||
    name !== component.name ||
    unit !== component.unit ||
    yieldNum !== component.yieldQty ||
    linesFp !== savedFp;

  function save() {
    if (!valid) {
      toast.error("Cần tên, đơn vị, định lượng > 0 và các dòng hợp lệ.");
      return;
    }
    const payload = {
      name: name.trim(),
      unit: unit.trim(),
      yieldQty: yieldNum,
      lines: priced.map((l) => ({
        ingredientId: l.ingredientId as number,
        qty: l.qtyNum as number,
      })),
    };
    startTransition(async () => {
      if (isNew) {
        await createComponent(payload);
        toast.success(`Đã thêm ${payload.name}.`);
        onClose?.();
      } else {
        await updateComponent({ id: component.id, ...payload });
        setSavedFp(linesFp);
        toast.success(`Đã lưu ${payload.name}.`);
      }
    });
  }

  function remove() {
    if (isNew) return;
    startTransition(async () => {
      const res = await deleteComponent({ id: component.id });
      if (res.ok) toast.success(`Đã xoá ${component.name}.`);
      else toast.error(res.reason);
      setConfirming(false);
    });
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3",
        isNew ? "border-primary/40" : "border-border/60",
      )}
    >
      {isNew && <div className="mb-2 text-sm font-medium">Thành phẩm mới</div>}

      <div className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
          Tên
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex w-20 flex-col gap-1 text-xs text-muted-foreground">
          Đơn vị
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
        </label>
        {!isNew &&
          (confirming ? (
            <div className="flex items-center gap-1.5 pb-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => setConfirming(false)}
                disabled={pending}
              >
                Không
              </Button>
              <Button
                size="sm"
                className="h-8 bg-destructive text-white hover:bg-destructive/90"
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
              aria-label={`Xoá ${component.name}`}
              className="mb-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          ))}
      </div>

      <div className="mt-2 flex items-end gap-3">
        <label className="flex w-32 flex-col gap-1 text-xs text-muted-foreground">
          Định lượng ({unit || "đv"})
          <Input
            inputMode="decimal"
            value={yieldQty}
            onChange={(e) => setYieldQty(e.target.value)}
            className="tabular-nums"
          />
        </label>
        <div className="ml-auto flex flex-col items-end gap-1 text-xs text-muted-foreground">
          Đơn giá
          <div className="flex h-9 items-center font-semibold tabular-nums">
            {unitCost != null
              ? `${formatVnd(unitCost)}/${unit || "đv"}`
              : "—"}
          </div>
        </div>
      </div>

      <div className="mt-2.5 space-y-2 border-t border-border/60 pt-2.5">
        {lines.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Chưa có nguyên liệu — thêm để tính đơn giá.
          </p>
        )}

        {priced.map((l) => (
          <div key={l.uid} className="flex items-center gap-1.5">
            <Select
              items={labels}
              value={l.ingredientId != null ? String(l.ingredientId) : ""}
              onValueChange={(v) =>
                setLines((ls) =>
                  ls.map((x) =>
                    x.uid === l.uid ? { ...x, ingredientId: Number(v) } : x,
                  ),
                )
              }
            >
              <SelectTrigger className="h-9 min-w-0 flex-1">
                <SelectValue placeholder="Chọn nguyên liệu" />
              </SelectTrigger>
              <SelectContent>
                {ingredients.map((i) => (
                  <SelectItem key={i.id} value={String(i.id)}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              inputMode="decimal"
              value={l.qty}
              onChange={(e) =>
                setLines((ls) =>
                  ls.map((x) =>
                    x.uid === l.uid ? { ...x, qty: e.target.value } : x,
                  ),
                )
              }
              placeholder="0"
              aria-label="Định lượng nguyên liệu"
              className="h-9 w-16 shrink-0 tabular-nums"
            />
            <span className="w-9 shrink-0 truncate text-xs text-muted-foreground">
              {l.ing?.unit ?? ""}
            </span>
            <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {l.cost != null ? formatVnd(l.cost) : "—"}
            </span>
            <button
              type="button"
              onClick={() =>
                setLines((ls) => ls.filter((x) => x.uid !== l.uid))
              }
              aria-label={`Xoá ${l.ing?.name ?? "dòng"}`}
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
            onClick={() =>
              setLines((ls) => [
                ...ls,
                { uid: nextUid++, ingredientId: null, qty: "" },
              ])
            }
            className="h-8 gap-1 text-xs"
          >
            <Plus className="size-3.5" />
            Thêm nguyên liệu
          </Button>
          <div className="flex items-center gap-2">
            {isNew && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                disabled={pending}
                className="h-8"
              >
                Huỷ
              </Button>
            )}
            <Button
              size="sm"
              onClick={save}
              disabled={!dirty || !valid || pending}
              className="h-8"
            >
              {pending ? "Đang lưu…" : isNew ? "Thêm" : "Lưu"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
