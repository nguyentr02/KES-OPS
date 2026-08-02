// Vietnam is UTC+7 with no daylight saving, so a fixed offset is exact.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export type PeriodKey = "today" | "week" | "month";

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hôm nay" },
  { key: "week", label: "7 ngày" },
  { key: "month", label: "Tháng này" },
];

const pad = (n: number) => String(n).padStart(2, "0");

/** A "shifted" Date whose UTC fields read as the Vietnam wall clock. */
function shifted(ms: number) {
  return new Date(ms + VN_OFFSET_MS);
}

/** VN date string (YYYY-MM-DD) for an instant. */
export function vnDateStr(d: Date): string {
  const s = shifted(d.getTime());
  return `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}-${pad(s.getUTCDate())}`;
}

export interface PeriodRange {
  key: PeriodKey;
  /** Order timestamps: startUtc <= createdAt < endUtc. */
  startUtc: Date;
  endUtc: Date;
  /** Expense dates (spent_on string): startDateStr <= spentOn <= endDateStr. */
  startDateStr: string;
  endDateStr: string;
  /** One entry per VN day in the range, oldest first. */
  buckets: { dateStr: string; label: string }[];
}

export function computePeriod(
  key: PeriodKey,
  nowMs: number = Date.now(),
): PeriodRange {
  const now = shifted(nowMs);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();

  let startShift: Date;
  if (key === "week") startShift = new Date(Date.UTC(y, m, d - 6));
  else if (key === "month") startShift = new Date(Date.UTC(y, m, 1));
  else startShift = new Date(Date.UTC(y, m, d));

  const endShiftExclusive = new Date(Date.UTC(y, m, d + 1)); // VN start of tomorrow

  const buckets: { dateStr: string; label: string }[] = [];
  for (
    let t = startShift.getTime();
    t < endShiftExclusive.getTime();
    t += 86_400_000
  ) {
    const s = new Date(t);
    buckets.push({
      dateStr: `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}-${pad(s.getUTCDate())}`,
      label: `${pad(s.getUTCDate())}/${pad(s.getUTCMonth() + 1)}`,
    });
  }

  return {
    key,
    startUtc: new Date(startShift.getTime() - VN_OFFSET_MS),
    endUtc: new Date(endShiftExclusive.getTime() - VN_OFFSET_MS),
    startDateStr: buckets[0].dateStr,
    endDateStr: buckets[buckets.length - 1].dateStr,
    buckets,
  };
}
