"use client";

import { Calendar } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

function display(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Calendar icon + date input on the dashboard — pick a day to see its numbers. */
export function DateFilter({ value }: { value: string | null }) {
  const router = useRouter();

  return (
    <div className="relative inline-flex">
      {/* Native date input overlays the button (transparent) so a tap anywhere
          opens the OS calendar picker. */}
      <input
        type="date"
        value={value ?? ""}
        aria-label="Chọn ngày"
        onChange={(e) => {
          const v = e.target.value;
          router.push(v ? `/?date=${v}` : "/");
        }}
        className="peer absolute inset-0 cursor-pointer opacity-0"
      />
      <div
        className={cn(
          "pointer-events-none inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
          value
            ? "border-primary bg-primary/12 text-primary"
            : "border-border/60 bg-card text-muted-foreground peer-hover:text-foreground",
        )}
      >
        <Calendar className="size-4" />
        {value ? display(value) : "Chọn ngày"}
      </div>
    </div>
  );
}
