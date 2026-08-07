"use client";

import { Calendar } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

function display(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Calendar button that opens the native date picker; pick a day to see its numbers. */
export function DateFilter({ value }: { value: string | null }) {
  const router = useRouter();

  return (
    <div className="relative inline-flex">
      {/* Visual only — the transparent date input on top captures the tap. */}
      <span
        aria-hidden
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
          value
            ? "border-primary bg-primary/12 text-primary"
            : "border-border/60 bg-card text-muted-foreground",
        )}
      >
        <Calendar className="size-4" />
        {value ? display(value) : "Chọn ngày"}
      </span>
      <input
        type="date"
        value={value ?? ""}
        aria-label="Chọn ngày"
        // Tapping the input opens the native picker on mobile; showPicker()
        // opens it on a desktop click. Kept transparent over the label above.
        onClick={(e) => {
          const el = e.currentTarget;
          if (typeof el.showPicker === "function") {
            try {
              el.showPicker();
            } catch {
              // some browsers throw if the picker is already opening — ignore
            }
          }
        }}
        onChange={(e) => {
          const v = e.target.value;
          router.push(v ? `/?date=${v}` : "/");
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </div>
  );
}
