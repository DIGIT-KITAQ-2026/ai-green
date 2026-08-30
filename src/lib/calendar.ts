/**
 * カレンダーの日付計算。予定は「日付だけ」を扱うため、
 * 比較や突き合わせはすべてローカル日付の "YYYY-MM-DD" 文字列で行う。
 * （Date同士の比較だと時刻やタイムゾーンでずれるため）
 */

export type YearMonth = { year: number; month: number }; // month は 1〜12

/** ローカル時間での "YYYY-MM-DD"。 */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

/** "2026-08" 形式を解釈する。不正な値なら今月を返す。 */
export function parseYearMonth(value?: string): YearMonth {
  const now = new Date();
  if (!value) return { year: now.getFullYear(), month: now.getMonth() + 1 };
  const m = /^(\d{4})-(\d{1,2})$/.exec(value);
  if (!m) return { year: now.getFullYear(), month: now.getMonth() + 1 };
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return { year: now.getFullYear(), month: now.getMonth() + 1 };
  return { year, month };
}

export function formatYearMonth({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** その月をカレンダー表示するための、日曜始まり6週分（42日）の配列。 */
export function monthGrid({ year, month }: YearMonth): Date[] {
  const first = new Date(year, month - 1, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay()); // 週の頭（日曜）まで戻す
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** その月の初日と、翌月の初日（予定を絞り込む範囲に使う）。 */
export function monthRange({ year, month }: YearMonth): { gte: Date; lt: Date } {
  return {
    gte: new Date(year, month - 1, 1),
    lt: new Date(year, month, 1),
  };
}

export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;
