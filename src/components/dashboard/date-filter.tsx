"use client";

import { Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import { cn } from "@/lib/utils";

function display(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Calendar button that opens the native date picker; pick a day to see its numbers. */
export function DateFilter({ value }: { value: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    // showPicker() reliably opens the native calendar on a click gesture;
    // a plain click on a transparent date input does not.
    if (typeof el.showPicker === "function") el.showPicker();
    else el.focus();
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
          value
            ? "border-primary bg-primary/12 text-primary"
            : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
        )}
      >
        <Calendar className="size-4" />
        {value ? display(value) : "Chọn ngày"}
      </button>
      <input
        ref={inputRef}
        type="date"
        value={value ?? ""}
        aria-label="Chọn ngày"
        tabIndex={-1}
        onChange={(e) => {
          const v = e.target.value;
          router.push(v ? `/?date=${v}` : "/");
        }}
        // Overlays the button (invisible, non-clickable) so showPicker() anchors
        // to it; the button captures the click and opens it.
        className="pointer-events-none absolute inset-0 opacity-0"
      />
    </div>
  );
}
