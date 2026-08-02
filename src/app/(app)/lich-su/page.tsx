import { desc } from "drizzle-orm";

import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const logs = await db
    .select()
    .from(activityLogs)
    .orderBy(desc(activityLogs.createdAt))
    .limit(200);

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold tracking-tight">
        Lịch sử chỉnh sửa
      </h1>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">
        Ghi lại các thao tác xóa và chỉnh sửa.
      </p>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
          Chưa có thao tác nào.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          {logs.map((log, i) => (
            <div
              key={log.id}
              className={cn("p-3", i > 0 && "border-t border-border/60")}
            >
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                  {log.action}
                </span>
                <span className="text-xs text-muted-foreground">
                  {log.actorName} · {formatDateTime(log.createdAt)}
                </span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {log.summary}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
