/** Overhead categories — ingredients are NOT here (tracked via product cost). */
export const EXPENSE_CATEGORIES = [
  "Thuê mặt bằng",
  "Lương",
  "Điện nước",
  "Marketing",
  "Khác",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
