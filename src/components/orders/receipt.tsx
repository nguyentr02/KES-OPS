"use client";

import { ArrowLeft, Download, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatVnd, paymentLabel } from "@/lib/format";

export type ReceiptData = {
  id?: number; // absent for a cart preview that hasn't been saved yet
  createdAt: string; // ISO
  paymentMethod: string;
  discountPercent: number;
  subtotal: number;
  revenueTotal: number;
  note: string | null;
  items: {
    name: string;
    size: string | null;
    qty: number;
    unit: number;
    line: number;
  }[];
};

const TZ = "Asia/Ho_Chi_Minh";

function fullDateTime(iso: string) {
  const d = new Date(iso);
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
    year: "numeric",
  }).format(d);
  return `${t} · ${day}`;
}

/**
 * Draw the receipt onto a canvas and return a PNG data URL. Rendering to an
 * image (rather than the DOM) makes it easy to hand to the customer over
 * Zalo/Messenger, and keeps the QR crisp and scannable.
 */
async function renderReceipt(data: ReceiptData): Promise<string> {
  const W = 720;
  const PAD = 56;

  // The QR is a same-origin asset, so drawing it won't taint the canvas.
  const qr = new Image();
  qr.src = "/qr-thanh-toan.png";
  try {
    await qr.decode();
  } catch {
    // If it fails to load we simply omit the QR rather than break the receipt.
  }

  // Draw onto an over-tall canvas, then crop to the real content height.
  const full = document.createElement("canvas");
  full.width = W;
  full.height = 4000;
  const ctx = full.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, full.height);

  const INK = "#2a1d10";
  const MUT = "#96856f";
  const LINE = "#e7ddcd";
  const ACC = "#5b3d1d";
  const RED = "#b0492f";
  const PANEL = "#faf6ef";
  const PANEL_BORDER = "#ece2d2";
  const TOTAL_BG = "#f3ead9";
  const SANS = "system-ui, -apple-system, Segoe UI, Arial, sans-serif";
  const CW = W - PAD * 2; // content width

  const draw = (
    s: string,
    x: number,
    yy: number,
    font: string,
    color: string,
    align: CanvasTextAlign,
    tracking = 0,
  ) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.letterSpacing = `${tracking}px`;
    ctx.fillText(s, x, yy);
    ctx.letterSpacing = "0px";
  };
  const hline = (yy: number) => {
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 7]);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(PAD, yy);
    ctx.lineTo(W - PAD, yy);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  const panel = (
    x: number,
    yy: number,
    w: number,
    h: number,
    fill: string,
    stroke?: string,
  ) => {
    ctx.beginPath();
    ctx.roundRect(x, yy, w, h, 18);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  let y = PAD + 30;

  // Header
  draw("KES CAFE", W / 2, y, `700 50px Georgia, "Times New Roman", serif`, ACC, "center");
  y += 44;
  draw("BIÊN LAI THANH TOÁN", W / 2, y, `600 18px ${SANS}`, MUT, "center", 3);
  y += 40;
  hline(y);
  y += 42;

  // Meta
  draw(
    data.id ? `Đơn #${data.id}` : "Ngày lập",
    PAD,
    y,
    data.id ? `600 25px ${SANS}` : `400 23px ${SANS}`,
    data.id ? INK : MUT,
    "left",
  );
  draw(fullDateTime(data.createdAt), W - PAD, y, `400 23px ${SANS}`, MUT, "right");
  y += 40;
  draw("Thanh toán", PAD, y, `400 23px ${SANS}`, MUT, "left");
  draw(
    paymentLabel[data.paymentMethod] ?? data.paymentMethod,
    W - PAD,
    y,
    `600 23px ${SANS}`,
    INK,
    "right",
  );
  y += 30;
  hline(y);
  y += 44;

  // Items
  const bodyB = `600 26px ${SANS}`;
  const small = `400 22px ${SANS}`;
  const maxNameW = CW - 190;
  data.items.forEach((it, i) => {
    if (i > 0) y += 66;
    let name = it.size ? `${it.name} (${it.size})` : it.name;
    ctx.font = bodyB;
    if (ctx.measureText(name).width > maxNameW) {
      while (name.length > 1 && ctx.measureText(name + "…").width > maxNameW) {
        name = name.slice(0, -1);
      }
      name = name + "…";
    }
    draw(name, PAD, y, bodyB, INK, "left");
    draw(formatVnd(it.line), W - PAD, y, bodyB, INK, "right");
    draw(`${it.qty} × ${formatVnd(it.unit)}`, PAD, y + 30, small, MUT, "left");
  });
  y += 44;
  hline(y);
  y += 42;

  // Totals. `adjustment` is a manual tip / take-off: revenue that differs from
  // the discounted subtotal. Shown on its own line so the numbers add up.
  const body = `400 25px ${SANS}`;
  const discountAmount = Math.round(
    (data.subtotal * data.discountPercent) / 100,
  );
  const adjustment = data.revenueTotal - (data.subtotal - discountAmount);
  if (data.discountPercent > 0 || adjustment !== 0) {
    draw("Tạm tính", PAD, y, body, MUT, "left");
    draw(formatVnd(data.subtotal), W - PAD, y, body, INK, "right");
    y += 40;
    if (data.discountPercent > 0) {
      draw(`Giảm ${data.discountPercent}%`, PAD, y, body, RED, "left");
      draw(`− ${formatVnd(discountAmount)}`, W - PAD, y, body, RED, "right");
      y += 40;
    }
    if (adjustment !== 0) {
      const up = adjustment > 0;
      draw(up ? "Khách trả thêm" : "Bớt lại", PAD, y, body, MUT, "left");
      draw(
        `${up ? "+" : "−"} ${formatVnd(Math.abs(adjustment))}`,
        W - PAD,
        y,
        body,
        up ? INK : RED,
        "right",
      );
      y += 40;
    }
    y += 8;
  }
  // Highlighted total band
  panel(PAD, y - 42, CW, 64, TOTAL_BG);
  draw("TỔNG CỘNG", PAD + 22, y, `700 30px ${SANS}`, INK, "left");
  draw(formatVnd(data.revenueTotal), W - PAD - 22, y, `700 34px ${SANS}`, ACC, "right");
  y += 30;
  if (data.note) {
    y += 34;
    draw(`Ghi chú: ${data.note}`, PAD, y, small, MUT, "left");
  }
  y += 44;

  // Payment panel (heading + amount + QR) grouped on a soft card
  const qw = 340;
  const qh = qr.naturalWidth ? (qw * qr.naturalHeight) / qr.naturalWidth : 0;
  const panelTop = y;
  const panelH = 30 + 30 + 30 + 16 + qh + 32;
  panel(PAD, panelTop, CW, panelH, PANEL, PANEL_BORDER);
  let py = panelTop + 30 + 26;
  draw("Quét mã QR để chuyển khoản", W / 2, py, `600 25px ${SANS}`, INK, "center");
  py += 30;
  draw(`Số tiền: ${formatVnd(data.revenueTotal)}`, W / 2, py, `600 24px ${SANS}`, ACC, "center");
  py += 16;
  if (qh) {
    const qx = (W - qw) / 2;
    // A white rounded card behind the QR, then clip the artwork to the same
    // rounded rect so its corners are smooth (the source crop is square).
    panel(qx, py, qw, qh, "#ffffff", PANEL_BORDER);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(qx, py, qw, qh, 18);
    ctx.clip();
    ctx.drawImage(qr, qx, py, qw, qh);
    ctx.restore();
  }
  y = panelTop + panelH + 40;

  // Footer
  draw("Cảm ơn quý khách!", W / 2, y, `italic 400 24px Georgia, serif`, MUT, "center");
  y += PAD;

  // Crop to actual height.
  const out = document.createElement("canvas");
  out.width = W;
  out.height = Math.round(y);
  out.getContext("2d")?.drawImage(full, 0, 0);
  return out.toDataURL("image/png");
}

/** The receipt image plus download/share actions — reused by the page and the
 *  cart preview modal. */
export function ReceiptView({ data }: { data: ReceiptData }) {
  const [url, setUrl] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const label = data.id ? `Biên lai #${data.id}` : "Biên lai";
  const title = "Biên lai thanh toán - KES Cafe";
  const fileName = `${title}.png`;

  useEffect(() => {
    let cancelled = false;
    void renderReceipt(data).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [data]);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "canShare" in navigator);
  }, []);

  function download() {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  }

  async function share() {
    if (!url) return;
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
      } else {
        download();
      }
    } catch {
      // user cancelled the share sheet — nothing to do
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-white">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- a canvas data URL, not an optimizable asset
          <img src={url} alt={label} className="w-full" />
        ) : (
          <div className="py-24 text-center text-sm text-muted-foreground">
            Đang tạo biên lai…
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button onClick={download} disabled={!url} className="h-11 flex-1">
          <Download className="size-4" /> Tải ảnh
        </Button>
        {canShare && (
          <Button
            onClick={share}
            disabled={!url}
            variant="outline"
            className="h-11 flex-1"
          >
            <Share2 className="size-4" /> Chia sẻ
          </Button>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Đưa khách xem để kiểm tra món &amp; tổng tiền, hoặc gửi ảnh qua
        Zalo/Messenger để khách quét mã thanh toán.
      </p>
    </>
  );
}

/** Full-page receipt for a saved order (opened from the orders list). */
export function Receipt({ data }: { data: ReceiptData }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4">
        <Button
          variant="ghost"
          render={<Link href="/orders" />}
          className="h-9 px-2"
        >
          <ArrowLeft className="size-4" /> Đơn hàng
        </Button>
      </div>
      <ReceiptView data={data} />
    </div>
  );
}
