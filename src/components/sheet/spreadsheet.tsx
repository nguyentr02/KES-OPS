"use client";

import {
  createUniver,
  defaultTheme,
  type FUniver,
  type IWorkbookData,
  LocaleType,
  merge,
  type Univer,
} from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import UniverPresetSheetsCoreViVN from "@univerjs/preset-sheets-core/locales/vi-VN";
import "@univerjs/preset-sheets-core/lib/index.css";
import { Save, Upload } from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { saveSheet } from "@/app/(app)/bang-tinh/actions";
import { Button } from "@/components/ui/button";

/** The Univer workbook mount + Save / Import-from-Excel. Client-only (canvas/DOM). */
export function Spreadsheet({
  initialData,
}: {
  initialData: Partial<IWorkbookData> | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const univerRef = useRef<Univer | null>(null);
  const apiRef = useRef<FUniver | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { univer, univerAPI } = createUniver({
      locale: LocaleType.VI_VN,
      locales: { [LocaleType.VI_VN]: merge({}, UniverPresetSheetsCoreViVN) },
      theme: defaultTheme,
      presets: [UniverSheetsCorePreset({ container })],
    });

    // Seed with the saved snapshot, or a blank workbook on first use.
    univerAPI.createWorkbook(initialData ?? {});

    univerRef.current = univer;
    apiRef.current = univerAPI;

    return () => {
      univerRef.current = null;
      apiRef.current = null;
      // Defer disposal: Univer unmounts its own React root synchronously, which
      // React forbids during a render/commit. A microtask runs it just after.
      queueMicrotask(() => univer.dispose());
    };
  }, [initialData]);

  async function onSave() {
    const wb = apiRef.current?.getActiveWorkbook();
    if (!wb) return;
    setSaving(true);
    try {
      await saveSheet(wb.save());
      toast.success("Đã lưu bảng tính");
    } catch {
      toast.error("Lưu không thành công", {
        description: "Vui lòng thử lại sau ít phút.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be picked again later
    const api = apiRef.current;
    if (!file || !api) return;

    setImporting(true);
    try {
      // SheetJS is heavy — load it only when the user actually imports.
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: true,
      });

      const sheets: Record<string, unknown> = {};
      const sheetOrder: string[] = [];

      wb.SheetNames.forEach((name, i) => {
        const ws = wb.Sheets[name];
        const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1:A1");
        const cellData: Record<
          number,
          Record<number, { v?: string | number | boolean; f?: string }>
        > = {};

        for (let r = range.s.r; r <= range.e.r; r++) {
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = ws[XLSX.utils.encode_cell({ r, c })];
            if (!cell) continue;
            const u: { v?: string | number | boolean; f?: string } = {};
            if (cell.f) u.f = "=" + cell.f;
            let v: unknown = cell.v;
            // Univer cells can't hold a Date — use SheetJS's formatted text.
            if (v instanceof Date) v = cell.w ?? v.toLocaleDateString("vi-VN");
            if (
              typeof v === "string" ||
              typeof v === "number" ||
              typeof v === "boolean"
            ) {
              u.v = v;
            }
            if (u.v === undefined && u.f === undefined) continue;
            (cellData[r] ??= {})[c] = u;
          }
        }

        const id = `sheet_${i}`;
        sheets[id] = {
          id,
          name,
          cellData,
          rowCount: Math.max(range.e.r + 21, 100),
          columnCount: Math.max(range.e.c + 6, 26),
        };
        sheetOrder.push(id);
      });

      if (sheetOrder.length === 0) throw new Error("empty workbook");

      const data = {
        id: `imported_${Date.now()}`,
        name: file.name.replace(/\.(xlsx|xls)$/i, ""),
        sheetOrder,
        sheets,
      } as Partial<IWorkbookData>;

      // Swap the workbook unit inside the existing Univer instance.
      const current = api.getActiveWorkbook();
      if (current) api.disposeUnit(current.getId());
      api.createWorkbook(data);

      toast.success("Đã nhập dữ liệu từ Excel", {
        description: "Kiểm tra rồi nhấn Lưu để lưu lại.",
      });
    } catch {
      toast.error("Không đọc được file Excel", {
        description: "Hãy chọn file .xlsx hợp lệ.",
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col md:h-[calc(100dvh-4rem)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          Bảng tính
        </h1>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={onImport}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="h-10"
          >
            <Upload className="size-4" />
            {importing ? "Đang nhập…" : "Nhập Excel"}
          </Button>
          <Button onClick={onSave} disabled={saving} className="h-10">
            <Save className="size-4" />
            {saving ? "Đang lưu…" : "Lưu"}
          </Button>
        </div>
      </div>
      {/* Univer renders its canvas + UI into this box; it needs a definite size. */}
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border/60"
      />
    </div>
  );
}
