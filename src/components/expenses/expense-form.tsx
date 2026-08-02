"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createExpense } from "@/app/(app)/expenses/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";
import { cn } from "@/lib/utils";

function todayLocal() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function ExpenseForm() {
  const router = useRouter();
  const [spentOn, setSpentOn] = useState(todayLocal());
  const [category, setCategory] =
    useState<(typeof EXPENSE_CATEGORIES)[number]>("Thuê mặt bằng");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const amt = Number(amount.replace(/[^\d]/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Số tiền không hợp lệ.");
      return;
    }
    startTransition(async () => {
      await createExpense({ spentOn, category, amount: amt, note });
      setAmount("");
      setNote("");
      toast.success("Đã thêm chi phí.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Ngày
          <Input
            type="date"
            value={spentOn}
            onChange={(e) => setSpentOn(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Số tiền (₫)
          <Input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="VD: 500000"
            className="tabular-nums"
          />
        </label>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 text-xs text-muted-foreground">Hạng mục</div>
        <div className="flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                category === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
        Ghi chú (tuỳ chọn)
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="VD: tiền điện tháng 7"
        />
      </label>

      <Button onClick={submit} disabled={pending} className="mt-4 h-10 w-full">
        {pending ? "Đang lưu…" : "Thêm chi phí"}
      </Button>
    </div>
  );
}
