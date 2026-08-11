"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateOrder } from "@/app/(app)/orders/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Payment = "cash" | "transfer";

/** Edit a saved order's money (tip / take-off), payment method and note. */
export function EditOrderButton({
  id,
  revenueTotal,
  paymentMethod,
  note,
}: {
  id: number;
  revenueTotal: number;
  paymentMethod: string;
  note: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(revenueTotal));
  const [pay, setPay] = useState<Payment>(
    paymentMethod === "transfer" ? "transfer" : "cash",
  );
  const [noteVal, setNoteVal] = useState(note ?? "");
  const [pending, startTransition] = useTransition();

  function openDialog() {
    // Reset to the order's current values every time it opens.
    setAmount(String(revenueTotal));
    setPay(paymentMethod === "transfer" ? "transfer" : "cash");
    setNoteVal(note ?? "");
    setOpen(true);
  }

  function submit() {
    const v = Math.round(Number(amount));
    if (!Number.isFinite(v) || v < 0) {
      toast.error("Số tiền không hợp lệ.");
      return;
    }
    startTransition(async () => {
      const res = await updateOrder(id, {
        revenueTotal: v,
        paymentMethod: pay,
        note: noteVal || undefined,
      });
      setOpen(false);
      if (res.ok) {
        toast.success(`Đã cập nhật đơn #${id}`);
        router.refresh();
      } else {
        toast.error("Không tìm thấy đơn.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Sửa đơn"
        title="Sửa đơn"
        onClick={openDialog}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Pencil className="size-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => !pending && setOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-border/60 bg-card p-5 shadow-lg">
            <div className="font-serif text-lg font-semibold">
              Sửa đơn #{id}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Chỉnh số tiền thực nhận (khách trả thêm / bớt lại), cách thanh
              toán và ghi chú.
            </p>

            <label className="mt-4 block text-sm font-medium">Tổng tiền</label>
            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              className="mt-1 h-10 w-full rounded-lg border border-input bg-transparent px-3 text-right font-serif text-lg font-semibold tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              {(
                [
                  ["cash", "Tiền mặt"],
                  ["transfer", "Chuyển khoản"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPay(value)}
                  className={cn(
                    "h-9 rounded-lg text-sm font-medium transition-colors",
                    pay === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              value={noteVal}
              onChange={(e) => setNoteVal(e.target.value)}
              placeholder="Ghi chú (tuỳ chọn)"
              className="mt-3 h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Hủy
              </Button>
              <Button onClick={submit} disabled={pending}>
                {pending ? "Đang lưu…" : "Lưu"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
