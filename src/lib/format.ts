// Up to 6 decimals so exact (un-rounded) costs from the workbook show in full;
// whole đồng still render clean (no forced decimals).
const vnd = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 6 });

/** 26000 → "26.000₫"; 3710.8 → "3.710,8₫". Never rounds. */
export function formatVnd(amount: number): string {
  return `${vnd.format(amount)}₫`;
}

/** 1250000 → "1,25 tr"; 26000 → "26k" — compact money for tight dashboard tiles. */
export function formatVndCompact(amount: number): string {
  const n = Math.round(amount);
  if (Math.abs(n) >= 1_000_000) {
    return `${vnd.format(Math.round(n / 100_000) / 10)} tr`;
  }
  if (Math.abs(n) >= 1_000) {
    return `${Math.round(n / 1000)}k`;
  }
  return `${n}`;
}

const pct = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

/** 0.4235 → "42,35%" (up to 2 decimals, not rounded to a whole percent). */
export function formatPercent(ratio: number): string {
  return `${pct.format(ratio * 100)}%`;
}

const TZ = "Asia/Ho_Chi_Minh";

/** A Date → "17/07/2026" in Vietnam time. */
export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: TZ }).format(d);
}

/** A Date → "14:32 · 17/07" in Vietnam time. */
export function formatDateTime(d: Date): string {
  const t = new Intl.DateTimeFormat("vi-VN", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  const day = new Intl.DateTimeFormat("vi-VN", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
  }).format(d);
  return `${t} · ${day}`;
}

/** Vietnamese label for a payment method. */
export const paymentLabel: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
};
