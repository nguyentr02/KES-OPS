"use client";

import { Coffee, Minus, Plus, Search, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { createOrder } from "@/app/(app)/orders/actions";
import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/format";
import { productImage } from "@/lib/product-images";
import { cn } from "@/lib/utils";

export type EntryProduct = {
  id: number;
  category: string;
  name: string;
  sizeLabel: string | null;
  salePrice: number;
};

type Payment = "cash" | "transfer";

/** Diacritic-insensitive normalise for search ("Cà phê" ~ "ca phe"). */
function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

type CartLine = EntryProduct & { qty: number; line: number };

export function OrderEntry({
  groups,
}: {
  groups: { category: string; items: EntryProduct[] }[];
}) {
  const router = useRouter();
  const all = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const categories = useMemo(
    () => ["Tất cả", ...groups.map((g) => g.category)],
    [groups],
  );

  const [cat, setCat] = useState("Tất cả");
  const [q, setQ] = useState("");
  const [qty, setQty] = useState<Record<number, number>>({});
  const [payment, setPayment] = useState<Payment>("cash");
  const [discount, setDiscount] = useState<0 | 10 | 20>(0);
  const [note, setNote] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    return all.filter(
      (p) =>
        (cat === "Tất cả" || p.category === cat) &&
        (!nq || norm(p.name).includes(nq)),
    );
  }, [all, cat, q]);

  const cart: CartLine[] = useMemo(
    () =>
      all
        .filter((p) => (qty[p.id] ?? 0) > 0)
        .map((p) => ({ ...p, qty: qty[p.id], line: qty[p.id] * p.salePrice })),
    [all, qty],
  );
  const count = cart.reduce((s, c) => s + c.qty, 0);
  const total = cart.reduce((s, c) => s + c.line, 0);

  function bump(id: number, d: number) {
    setQty((x) => {
      const n = Math.max(0, (x[id] ?? 0) + d);
      const c = { ...x };
      if (n === 0) delete c[id];
      else c[id] = n;
      return c;
    });
  }
  function removeItem(id: number) {
    setQty((x) => {
      const c = { ...x };
      delete c[id];
      return c;
    });
  }

  function save() {
    if (count === 0) {
      toast.error("Chưa chọn món nào.");
      return;
    }
    const items = cart.map((c) => ({ productId: c.id, qty: c.qty }));
    const net = total - Math.round((total * discount) / 100);
    startTransition(async () => {
      const res = await createOrder({
        items,
        paymentMethod: payment,
        discountPercent: discount,
        note,
      });
      if (res.ok) {
        setQty({});
        setNote("");
        setDiscount(0);
        setCartOpen(false);
        toast.success(`Đã lưu đơn #${res.orderId} · ${formatVnd(net)}`);
        router.push("/orders");
      }
    });
  }

  const cartProps = {
    cart,
    total,
    payment,
    setPayment,
    discount,
    setDiscount,
    note,
    setNote,
    bump,
    removeItem,
    save,
    pending,
  };

  return (
    <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-4">
      {/* ---------------- Left: products ---------------- */}
      <div>
        <h1 className="mb-3 font-serif text-2xl font-semibold tracking-tight">
          Đơn mới
        </h1>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm món…"
            className="h-10 w-full rounded-lg border border-input bg-transparent pr-3 pl-9 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                cat === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              p={p}
              qty={qty[p.id] ?? 0}
              onAdd={() => bump(p.id, 1)}
            />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">
            Không tìm thấy món.
          </p>
        )}
      </div>

      {/* ---------------- Right: cart (tablet/desktop) ---------------- */}
      <aside className="hidden lg:block">
        <div className="sticky top-20 flex max-h-[calc(100dvh-6rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card">
          <CartContents {...cartProps} />
        </div>
      </aside>

      {/* ---------------- Cart (phone): bar + drawer ---------------- */}
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="fixed inset-x-3 bottom-20 z-30 flex items-center justify-between gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-lg lg:hidden"
      >
        <span className="text-sm font-medium">{count} món</span>
        <span className="font-serif text-lg font-semibold tabular-nums">
          {formatVnd(total)}
        </span>
      </button>

      {cartOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setCartOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl bg-card">
            <CartContents {...cartProps} onClose={() => setCartOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({
  p,
  qty,
  onAdd,
}: {
  p: EntryProduct;
  qty: number;
  onAdd: () => void;
}) {
  const img = productImage(p.name);
  return (
    <button
      type="button"
      onClick={onAdd}
      className={cn(
        "overflow-hidden rounded-xl border bg-card text-left transition-colors",
        qty > 0 ? "border-primary" : "border-border/60",
      )}
    >
      <div className="relative aspect-square bg-surface">
        {img ? (
          <Image
            src={img}
            alt={p.name}
            fill
            sizes="(min-width:1280px) 15vw, (min-width:640px) 30vw, 45vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary/40">
            <Coffee className="size-8" />
          </div>
        )}
        {qty > 0 && (
          <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums">
            {qty}
          </span>
        )}
      </div>
      <div className="p-2">
        <div className="truncate text-sm font-medium">
          {p.name}
          {p.sizeLabel && (
            <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
              {p.sizeLabel}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-sm font-semibold text-primary tabular-nums">
          {formatVnd(p.salePrice)}
        </div>
      </div>
    </button>
  );
}

function CartContents({
  cart,
  total,
  payment,
  setPayment,
  discount,
  setDiscount,
  note,
  setNote,
  bump,
  removeItem,
  save,
  pending,
  onClose,
}: {
  cart: CartLine[];
  total: number;
  payment: Payment;
  setPayment: (p: Payment) => void;
  discount: 0 | 10 | 20;
  setDiscount: (d: 0 | 10 | 20) => void;
  note: string;
  setNote: (s: string) => void;
  bump: (id: number, d: number) => void;
  removeItem: (id: number) => void;
  save: () => void;
  pending: boolean;
  onClose?: () => void;
}) {
  const discountAmount = Math.round((total * discount) / 100);
  const net = total - discountAmount;
  return (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 p-3">
        <span className="font-serif text-lg font-semibold">Đơn hàng</span>
        {onClose && (
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="min-h-24 flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Chạm vào món để thêm vào đơn.
          </p>
        ) : (
          cart.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 border-b border-border/60 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {c.name}
                  {c.sizeLabel && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({c.sizeLabel})
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {formatVnd(c.line)}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Bớt"
                  onClick={() => bump(c.id, -1)}
                  className="flex size-8 items-center justify-center rounded-lg border border-border"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-5 text-center text-sm font-semibold tabular-nums">
                  {c.qty}
                </span>
                <button
                  type="button"
                  aria-label="Thêm"
                  onClick={() => bump(c.id, 1)}
                  className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                >
                  <Plus className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Xoá"
                  onClick={() => removeItem(c.id)}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-border/60 p-3">
        <div className="mb-2 grid grid-cols-2 gap-2">
          {(
            [
              ["cash", "Tiền mặt"],
              ["transfer", "Chuyển khoản"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPayment(value)}
              className={cn(
                "h-9 rounded-lg text-sm font-medium transition-colors",
                payment === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Quick discount — small chips so they don't look like the payment toggle */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Giảm giá</span>
          {([10, 20] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDiscount(discount === d ? 0 : d)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                discount === d
                  ? "border-primary bg-primary/12 text-primary"
                  : "border-border text-muted-foreground",
              )}
            >
              {d}%
            </button>
          ))}
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú (tuỳ chọn)"
          className="mb-2 h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />

        {discount > 0 && (
          <div className="mb-1 space-y-0.5 text-sm text-muted-foreground tabular-nums">
            <div className="flex justify-between">
              <span>Tạm tính</span>
              <span>{formatVnd(total)}</span>
            </div>
            <div className="flex justify-between text-destructive">
              <span>Giảm {discount}%</span>
              <span>−{formatVnd(discountAmount)}</span>
            </div>
          </div>
        )}
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Tổng tiền</span>
          <span className="font-serif text-xl font-semibold tabular-nums">
            {formatVnd(net)}
          </span>
        </div>
        <Button
          onClick={save}
          disabled={pending || cart.length === 0}
          className="h-11 w-full"
        >
          {pending ? "Đang lưu…" : "Lưu đơn"}
        </Button>
      </div>
    </>
  );
}
