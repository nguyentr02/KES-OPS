import type { IWorkbookData } from "@univerjs/presets";
import { asc } from "drizzle-orm";

import { SpreadsheetLoader } from "@/components/sheet/spreadsheet-loader";
import { db } from "@/db";
import { sheets } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function BangTinhPage() {
  const [sheet] = await db
    .select()
    .from(sheets)
    .orderBy(asc(sheets.id))
    .limit(1);

  const initialData = (sheet?.data as Partial<IWorkbookData> | null) ?? null;

  return <SpreadsheetLoader initialData={initialData} />;
}
