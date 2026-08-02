"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { deleteExpense } from "@/app/(app)/expenses/actions";

export function DeleteExpenseButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label="Xoá"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteExpense(id);
          toast.success("Đã xoá.");
          router.refresh();
        })
      }
      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
