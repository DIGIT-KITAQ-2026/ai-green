import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createEventAction, deleteEventAction } from "@/app/actions/events";
import {
  dateKey,
  formatYearMonth,
  monthRange,
  parseYearMonth,
  shiftMonth,
  todayKey,
} from "@/lib/calendar";
import { Icon } from "@/components/IconSprite";
import MonthCalendar from "@/components/MonthCalendar";
import PageTitle from "@/components/PageTitle";
import SubmitButton from "@/components/SubmitButton";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import TodoList from "@/components/TodoList";
import TodoQuickAdd from "@/components/TodoQuickAdd";

const DAY_FMT = new Intl.DateTimeFormat("ja-JP", {
  month: "long",
  day: "numeric",
  weekday: "short",
});

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; day?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { ym, day, error } = await searchParams;
  const yearMonth = parseYearMonth(ym);
  const range = monthRange(yearMonth);
  const selectedKey = day ?? todayKey();

  const [events, monthTodos, noDueTodos] = await Promise.all([
    user.teamId
      ? prisma.event.findMany({
          where: { teamId: user.teamId, date: { gte: range.gte, lt: range.lt } },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
          include: { createdBy: { select: { name: true } } },
        })
      : Promise.resolve([]),
    // カレンダーのマスと、選択日パネルの「この日が期限のToDo」に使う。
    prisma.todo.findMany({
      where: { userId: user.id, dueDate: { gte: range.gte, lt: range.lt } },
      orderBy: [{ done: "asc" }, { createdAt: "asc" }],
    }),
    // 期限のないToDoは日付マスに置けないので、ページ下部に常時リストする。
    prisma.todo.findMany({
      where: { userId: user.id, dueDate: null },
      orderBy: [{ done: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  // where句で絞り込み済みだが、Prisma上の型は Date | null のままなので明示的に絞る。
  const datedTodos = monthTodos.filter(
    (t): t is typeof t & { dueDate: Date } => t.dueDate !== null,
  );

  const selected = events.filter((e) => dateKey(e.date) === selectedKey);
  const selectedTodos = datedTodos.filter((t) => dateKey(t.dueDate) === selectedKey);
  const openNoDueTodos = noDueTodos.filter((t) => !t.done);
  const doneNoDueTodos = noDueTodos.filter((t) => t.done);
  const prev = formatYearMonth(shiftMonth(yearMonth, -1));
  const next = formatYearMonth(shiftMonth(yearMonth, 1));
  const current = formatYearMonth(yearMonth);
  /** 操作後に同じ月・同じ日を開き直すための戻り先。 */
  const from = `/calendar?ym=${current}&day=${selectedKey}`;

  return (
    <div>
      <PageTitle>カレンダー</PageTitle>

      {error && <p className="banner-error mb-5">{error}</p>}
      {!user.teamId && (
        <p className="banner-error mb-5">
          所属チームが未設定のため、予定を表示・登録できません。設定画面から所属を選んでください。
        </p>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        <section className="min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <Link
                href={`/calendar?ym=${prev}`}
                aria-label="前の月"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface transition hover:border-matcha"
              >
                <Icon name="back" className="h-4 w-4" />
              </Link>
              <Link
                href={`/calendar?ym=${next}`}
                aria-label="次の月"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface transition hover:border-matcha"
              >
                <Icon name="back" className="h-4 w-4 rotate-180" />
              </Link>
            </div>
            <h2 className="font-display text-lg font-black">
              {yearMonth.year}年{yearMonth.month}月
            </h2>
            <Link
              href="/calendar"
              className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-inksoft transition hover:border-matcha hover:text-matcha"
            >
              今月へ
            </Link>
          </div>

          <MonthCalendar
            yearMonth={yearMonth}
            events={events}
            todos={datedTodos}
            selectedKey={selectedKey}
            dayHref={(k) => `/calendar?ym=${current}&day=${k}`}
          />
          <p className="mt-2 text-[11px] text-inkfaint">
            日付を選ぶとその日の予定・ToDoが出ます。予定はチーム全員で共有され、ToDoは自分だけに表示されます。
          </p>
        </section>

        <aside className="w-full shrink-0 lg:w-80">
          <div className="card rounded-tile p-5">
            <h2 className="section-title mb-1">
              {DAY_FMT.format(new Date(`${selectedKey}T12:00:00`))}
            </h2>
            <p className="mb-4 text-[11px] text-inkfaint">この日の予定</p>

            {selected.length === 0 ? (
              <p className="py-4 text-center text-sm text-inkfaint">
                予定はありません。
              </p>
            ) : (
              <ul className="mb-5 flex flex-col divide-y divide-line">
                {selected.map((e) => (
                  <li key={e.id} className="flex items-start gap-2 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold text-ink">
                        {e.startTime && (
                          <span className="mr-1.5 text-matcha">{e.startTime}</span>
                        )}
                        {e.title}
                      </p>
                      {e.note && (
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-inksoft">
                          {e.note}
                        </p>
                      )}
                      <p className="mt-0.5 text-[10px] text-inkfaint">
                        登録: {e.createdBy?.name ?? "退会したユーザー"}
                      </p>
                    </div>
                    <form action={deleteEventAction} className="shrink-0">
                      <input type="hidden" name="eventId" value={e.id} />
                      <input type="hidden" name="from" value={from} />
                      <ConfirmSubmitButton
                        confirmMessage={`予定「${e.title}」を削除します。よろしいですか？`}
                        pendingLabel="…"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-inkfaint transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        ×
                      </ConfirmSubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 border-t border-line pt-4">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="text-xs font-bold text-inksoft">この日が期限のToDo</p>
                {selectedTodos.length > 0 && (
                  <span className="text-[11px] text-inkfaint">{selectedTodos.length}件</span>
                )}
              </div>
              <TodoQuickAdd from={from} withDueDate={false} defaultDueDate={selectedKey} />
              <div className="mt-2">
                <TodoList
                  todos={selectedTodos}
                  from={from}
                  emptyMessage="この日が期限のToDoはありません。"
                />
              </div>
            </div>

            {/* 期限のないToDoはカレンダーのマスに置けないので、この日の情報の下にまとめて常時表示する。 */}
            <div className="mt-5 border-t border-line pt-4">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="text-xs font-bold text-inksoft">期限なしのToDo</p>
                {openNoDueTodos.length > 0 && (
                  <span className="text-[11px] text-inkfaint">{openNoDueTodos.length}件</span>
                )}
              </div>
              <TodoQuickAdd from={from} withDueDate={false} />
              <div className="mt-2">
                <TodoList
                  todos={openNoDueTodos}
                  from={from}
                  emptyMessage="期限なしのやることはないよ。"
                />
              </div>

              {doneNoDueTodos.length > 0 && (
                <div className="mt-4 border-t border-line pt-3">
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <p className="text-xs font-bold text-inksoft">終わったこと</p>
                    <span className="text-[11px] text-inkfaint">{doneNoDueTodos.length}件</span>
                  </div>
                  <div className="opacity-80">
                    <TodoList todos={doneNoDueTodos} from={from} />
                  </div>
                </div>
              )}
            </div>

            {user.teamId && (
              <form
                action={createEventAction}
                className="flex flex-col gap-3 border-t border-line pt-4"
              >
                <input type="hidden" name="from" value={from} />
                <p className="text-xs font-bold text-inksoft">予定を追加</p>
                <input
                  name="title"
                  required
                  placeholder="予定名"
                  aria-label="予定名"
                  className="field-input py-2 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={selectedKey}
                    aria-label="日付"
                    className="field-input min-w-0 flex-1 py-2 text-sm"
                  />
                  <input
                    type="time"
                    name="startTime"
                    aria-label="開始時刻（任意）"
                    className="field-input w-28 shrink-0 py-2 text-sm"
                  />
                </div>
                <input
                  name="note"
                  placeholder="メモ（任意）"
                  aria-label="メモ"
                  className="field-input py-2 text-sm"
                />
                <SubmitButton pendingLabel="追加中…" className="btn-secondary py-2 text-sm">
                  この予定を追加
                </SubmitButton>
              </form>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
