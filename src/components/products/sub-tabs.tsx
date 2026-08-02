"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/products", label: "Món" },
  { href: "/products/thanh-pham", label: "Thành phẩm thô" },
  { href: "/products/nguyen-lieu", label: "Nguyên liệu" },
];

export function ProductSubTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-border/60">
      {TABS.map((t) => {
        const active =
          t.href === "/products"
            ? pathname === "/products"
            : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
