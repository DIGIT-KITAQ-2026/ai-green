import Link from "next/link";
import {
  WEEKDAY_LABELS,
  YearMonth,
  dateKey,
  monthGrid,
  todayKey,
} from "@/lib/calendar";

export type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  startTime: string | null;
};

/**
 * 月表示のカレンダー。
 * compact（ホーム画面用）は日付と予定の有無だけを出し、
 * そうでない場合は各日のマスに予定名を並べる。
 */
export default function MonthCalendar({
  yearMonth,
  events,
  compact = false,
  selectedKey,
  dayHref,
}: {
  yearMonth: YearMonth;
  events: CalendarEvent[];
  compact?: boolean;
  /** 選択中の日（フル表示で使う） */
  selectedKey?: string;
  /** 日付をリンクにする場合のURLを組み立てる関数 */
  dayHref?: (key: string) => string;
}) {
  const days = monthGrid(yearMonth);
  const today = todayKey();

  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const k = dateKey(e.date);
    const list = byDay.get(k) ?? [];
    list.push(e);
    byDay.set(k, list);
  }
  // 時刻がある予定を先に、同じなら登録順で並べる。
  for (const list of byDay.values()) {
    list.sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"));
  }

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((w, i) => (
          <div
            key={w}
            className={`py-1 text-center text-[11px] font-bold ${
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-inkfaint"
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = dateKey(d);
          const inMonth = d.getMonth() + 1 === yearMonth.month;
          const isToday = key === today;
          const isSelected = key === selectedKey;
          const dayEvents = byDay.get(key) ?? [];

          const cell = (
            <div
              className={`flex h-full flex-col rounded-lg border p-1 transition ${
                // 狭い画面ではマスが縦長になりすぎるので低くする
                compact ? "min-h-[2.6rem]" : "min-h-[3rem] sm:min-h-[5.5rem]"
              } ${
                isSelected
                  ? "border-matcha bg-matcha-soft"
                  : isToday
                    ? "border-matcha bg-white"
                    : "border-line bg-white"
              } ${inMonth ? "" : "opacity-40"} ${dayHref ? "hover:border-matcha" : ""}`}
            >
              <span
                className={`self-end text-[11px] leading-none ${
                  isToday
                    ? "rounded-full bg-matcha px-1.5 py-1 font-bold text-white"
                    : d.getDay() === 0
                      ? "px-1 py-1 text-red-500"
                      : d.getDay() === 6
                        ? "px-1 py-1 text-blue-500"
                        : "px-1 py-1 text-inksoft"
                }`}
              >
                {d.getDate()}
              </span>

              {compact ? (
                dayEvents.length > 0 && (
                  <span className="mt-auto flex justify-center gap-0.5 pb-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <span key={e.id} className="h-1.5 w-1.5 rounded-full bg-folder" />
                    ))}
                  </span>
                )
              ) : (
                <>
                  {/* 狭い画面では予定名が切れて読めないので点だけにする */}
                  {dayEvents.length > 0 && (
                    <span className="mt-auto flex justify-center gap-0.5 pb-0.5 sm:hidden">
                      {dayEvents.slice(0, 3).map((e) => (
                        <span key={e.id} className="h-1.5 w-1.5 rounded-full bg-folder" />
                      ))}
                    </span>
                  )}
                  <ul className="mt-0.5 hidden flex-col gap-0.5 overflow-hidden sm:flex">
                    {dayEvents.slice(0, 3).map((e) => (
                      <li
                        key={e.id}
                        className="truncate rounded bg-folder px-1 py-0.5 text-[10px] font-bold leading-tight text-ink"
                        title={e.title}
                      >
                        {e.startTime ? `${e.startTime} ` : ""}
                        {e.title}
                      </li>
                    ))}
                    {dayEvents.length > 3 && (
                      <li className="px-1 text-[10px] text-inkfaint">
                        ほか{dayEvents.length - 3}件
                      </li>
                    )}
                  </ul>
                </>
              )}
            </div>
          );

          return dayHref ? (
            <Link key={key} href={dayHref(key)} className="block">
              {cell}
            </Link>
          ) : (
            <div key={key}>{cell}</div>
          );
        })}
      </div>
    </div>
  );
}
