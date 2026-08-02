"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteOrder } from "@/app/(app)/orders/actions";
import { Button } from "@/components/ui/button";

export function DeleteOrderButton({ id }: { id: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      const res = await deleteOrder(id);
      setOpen(false);
      if (res.ok) {
        toast.success(`Đã xóa đơn #${id}`);
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
        aria-label="Xóa đơn"
        onClick={() => setOpen(true)}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => !pending && setOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-border/60 bg-card p-5 shadow-lg">
            <div className="font-serif text-lg font-semibold">Xóa đơn #{id}?</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Không thể hoàn tác. Đơn sẽ được ghi vào Lịch sử chỉnh sửa.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={pending}
              >
                {pending ? "Đang xóa…" : "Xóa"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
