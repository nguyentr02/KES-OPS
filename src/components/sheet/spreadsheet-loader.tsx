"use client";

import type { IWorkbookData } from "@univerjs/presets";
import dynamic from "next/dynamic";

// Univer touches window/canvas, so it must not render on the server. `ssr:false`
// is only allowed inside a Client Component — hence this thin wrapper.
const Spreadsheet = dynamic(
  () => import("./spreadsheet").then((m) => m.Spreadsheet),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100dvh-8rem)] items-center justify-center text-sm text-muted-foreground md:h-[calc(100dvh-4rem)]">
        Đang tải bảng tính…
      </div>
    ),
  },
);

export function SpreadsheetLoader({
  initialData,
}: {
  initialData: Partial<IWorkbookData> | null;
}) {
  return <Spreadsheet initialData={initialData} />;
}
