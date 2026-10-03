"use client";

import { ArrowDown, ArrowUp, ChefHat, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { savePrepSteps } from "@/app/(app)/products/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Draft = { uid: number; text: string };

let nextUid = 0;

/**
 * How a drink is made. Opens on the steps themselves — editing is a separate
 * mode behind "Sửa", so the common case (reading while making the drink) is
 * not a wall of text boxes. Steps are shared by every size of the drink, so
 * the dialog is keyed by product name, not product id.
 */
export function PrepStepsDialog({
  productName,
  initial,
}: {
  productName: string;
  initial: string[];
}) {
  const [open, setOpen] = useState(false);
  const has = initial.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Cách làm ${productName}`}
        title="Cách làm"
        className={cn(
          "shrink-0 rounded-full p-1.5 transition-colors",
          has
            ? "bg-primary/12 text-primary hover:bg-primary/20"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <ChefHat className="size-4" />
      </button>

      {/* Mounted only while open so each drink keeps a fresh draft. */}
      {open && (
        <StepsDialog
          productName={productName}
          initial={initial}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function StepsDialog({
  productName,
  initial,
  onClose,
}: {
  productName: string;
  initial: string[];
  onClose: () => void;
}) {
  // What is stored. Updated on save so the view shows the edit straight away,
  // without waiting for revalidation to push new props down.
  const [steps, setSteps] = useState<string[]>(initial);
  const [editing, setEditing] = useState(false);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cách làm — {productName}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Định lượng nằm ở phần Công thức — ở đây chỉ ghi các bước."
              : "Các bước dùng chung cho mọi size của món."}
          </DialogDescription>
        </DialogHeader>

        {editing ? (
          <StepsEditor
            productName={productName}
            steps={steps}
            onSaved={(next) => {
              setSteps(next);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <StepsView
            steps={steps}
            onEdit={() => setEditing(true)}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Read-only — what you look at while actually making the drink. */
function StepsView({
  steps,
  onEdit,
  onClose,
}: {
  steps: string[];
  onEdit: () => void;
  onClose: () => void;
}) {
  const empty = steps.length === 0;

  return (
    <>
      {empty ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <ChefHat className="size-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            Món này chưa có cách làm.
            <br />
            Hãy thêm các bước để pha cho đồng đều.
          </p>
        </div>
      ) : (
        <ol className="space-y-2.5">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold tabular-nums text-primary">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap pt-0.5 text-sm">
                {s}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-2 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Đóng
        </Button>
        <Button
          size="sm"
          variant={empty ? "default" : "outline"}
          onClick={onEdit}
          className="gap-1"
        >
          {empty ? (
            <>
              <Plus className="size-3.5" />
              Thêm cách làm
            </>
          ) : (
            <>
              <Pencil className="size-3.5" />
              Sửa
            </>
          )}
        </Button>
      </div>
    </>
  );
}

function StepsEditor({
  productName,
  steps,
  onSaved,
  onCancel,
}: {
  productName: string;
  steps: string[];
  onSaved: (next: string[]) => void;
  onCancel: () => void;
}) {
  // A blank recipe starts on one empty line — nothing to type into otherwise.
  const [draft, setDraft] = useState<Draft[]>(() =>
    steps.length > 0
      ? steps.map((t) => ({ uid: nextUid++, text: t }))
      : [{ uid: nextUid++, text: "" }],
  );
  const [pending, startTransition] = useTransition();

  const clean = draft.map((s) => s.text.trim()).filter((t) => t !== "");
  const dirty = clean.join("\n") !== steps.join("\n");
  const tooLong = draft.some((s) => s.text.trim().length > 500);

  function move(index: number, by: number) {
    const to = index + by;
    if (to < 0 || to >= draft.length) return;
    setDraft((ls) => {
      const next = [...ls];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  }

  function save() {
    if (tooLong) {
      toast.error("Mỗi bước tối đa 500 ký tự.");
      return;
    }
    startTransition(async () => {
      await savePrepSteps({ productName, steps: clean });
      toast.success(`Đã lưu cách làm ${productName}.`);
      onSaved(clean);
    });
  }

  return (
    <>
      <div className="space-y-2">
        {draft.map((s, i) => (
          <div key={s.uid} className="flex items-start gap-2">
            <span className="mt-2 w-5 shrink-0 text-right text-sm font-semibold tabular-nums text-muted-foreground">
              {i + 1}.
            </span>
            <Textarea
              value={s.text}
              onChange={(e) =>
                setDraft((ls) =>
                  ls.map((x) =>
                    x.uid === s.uid ? { ...x, text: e.target.value } : x,
                  ),
                )
              }
              rows={2}
              placeholder="Ví dụ: Cho 40ml cà phê cốt vào ly."
              aria-label={`Bước ${i + 1}`}
              className="min-h-16 flex-1 resize-y"
            />
            <div className="flex shrink-0 flex-col gap-0.5">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`Chuyển bước ${i + 1} lên`}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === draft.length - 1}
                aria-label={`Chuyển bước ${i + 1} xuống`}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <ArrowDown className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setDraft((ls) => ls.filter((x) => x.uid !== s.uid))
                }
                aria-label={`Xoá bước ${i + 1}`}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}

        <Button
          size="sm"
          variant="outline"
          onClick={() => setDraft((ls) => [...ls, { uid: nextUid++, text: "" }])}
          className="h-8 gap-1 text-xs"
        >
          <Plus className="size-3.5" />
          Thêm bước
        </Button>
      </div>

      <div className="mt-2 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Huỷ
        </Button>
        <Button size="sm" onClick={save} disabled={!dirty || pending}>
          {pending ? "Đang lưu…" : "Lưu"}
        </Button>
      </div>
    </>
  );
}
