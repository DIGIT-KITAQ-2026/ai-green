import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Icon, IconName } from "@/components/IconSprite";
import Mascot from "@/components/Mascot";
import PageTitle from "@/components/PageTitle";
import MonthCalendar from "@/components/MonthCalendar";
import TodoList from "@/components/TodoList";
import TodoQuickAdd from "@/components/TodoQuickAdd";
import { dateKey, monthRange, parseYearMonth } from "@/lib/calendar";
import { levelInfo, rewardById } from "@/lib/rewards";

// チャットが主機能なので先頭。以降は使う頻度が高い順に並べている。
const TILES: { href: string; label: string; icon: IconName; note: string }[] = [
  {
    href: "/chat",
    label: "チャット",
    icon: "chat",
    note: "わからないことをAIに質問する",
  },
  {
    href: "/tasks",
    label: "業務内容",
    icon: "book",
    note: "登録された業務を見る・新しい業務を伝える",
  },
    {
    href: "/team-notes",
    label: "みんなのメモ",
    icon: "shared-note",
    note: "チャットで分かったことをチームで共有する",
  },
{
    href: "/calendar",
    label: "カレンダー",
    icon: "calendar",
    note: "チームの予定・自分のToDoを見る・登録する",
  },
  {
    href: "/notes",
    label: "メモ",
    icon: "note",
    note: "気づいたこと・教わったことを書き留める",
  },
  {
    href: "/character",
    label: "キャラクター",
    icon: "star",
    note: "レベルと、もらえるキャラクターを見る",
  },
];

const UPCOMING_FMT = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
  weekday: "short",
});

export default async function HomePage() {
  const user = await getCurrentUser();
  const yearMonth = parseYearMonth();
  const range = monthRange(yearMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [team, monthEvents, monthTodos, upcoming, openTodos] = await Promise.all([
    user?.teamId
      ? prisma.team.findUnique({ where: { id: user.teamId } })
      : Promise.resolve(null),
    // 今月のカレンダーに印を付けるための予定。
    user?.teamId
      ? prisma.event.findMany({
          where: { teamId: user.teamId, date: { gte: range.gte, lt: range.lt } },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
        })
      : Promise.resolve([]),
    // 今月のカレンダーに印を付けるための期限付きToDo。
    user
      ? prisma.todo.findMany({
          where: { userId: user.id, dueDate: { gte: range.gte, lt: range.lt } },
          orderBy: [{ done: "asc" }, { createdAt: "asc" }],
        })
      : Promise.resolve([]),
    // 今日以降の直近の予定（月をまたいでも拾えるよう別に取る）。
    user?.teamId
      ? prisma.event.findMany({
          where: { teamId: user.teamId, date: { gte: today } },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
          take: 4,
        })
      : Promise.resolve([]),
    user
      ? prisma.todo.findMany({
          where: { userId: user.id, done: false },
          orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  const openTodoCount = user
    ? await prisma.todo.count({ where: { userId: user.id, done: false } })
    : 0;

  // where句で絞り込み済みだが、Prisma上の型は Date | null のままなので明示的に絞る。
  const datedMonthTodos = monthTodos.flatMap((t) =>
    t.dueDate ? [{ ...t, dueDate: t.dueDate }] : [],
  );

  const info = levelInfo(user?.xp ?? 0);
  const reward = rewardById(user?.selectedRewardId);

  return (
    <div>
      <PageTitle>{team ? team.name : "ホーム"}</PageTitle>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {TILES.map((tile) => (
          <Link key={tile.href} href={tile.href} className="tile">
            <span className="text-lg">{tile.label}</span>
            <Icon name={tile.icon} className="h-12 w-12" strokeWidth={1.4} />
            <span className="max-w-[15rem] text-xs font-normal leading-relaxed text-white/85">
              {tile.note}
            </span>
          </Link>
        ))}
      </div>

      {/* カレンダー(予定・ToDo)はホームから直接見える・触れるようにする。 */}
      <section className="mt-7 card rounded-tile p-5">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="section-title">
            {yearMonth.year}年{yearMonth.month}月の予定
          </h2>
          <Link
            href="/calendar"
            className="text-xs font-bold text-matcha underline underline-offset-2 hover:text-matcha-deep"
          >
            カレンダーを開く
          </Link>
        </div>

        <MonthCalendar
          yearMonth={yearMonth}
          events={monthEvents}
          todos={datedMonthTodos}
          compact
        />

        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-xs font-bold text-inkfaint">近日の予定</p>
          {upcoming.length === 0 ? (
            <p className="py-2 text-sm text-inkfaint">
              これからの予定はありません。
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-baseline gap-2.5 text-sm">
                  <span
                    className={`shrink-0 text-xs font-bold ${
                      dateKey(e.date) === dateKey(new Date())
                        ? "text-red-600"
                        : "text-matcha"
                    }`}
                  >
                    {UPCOMING_FMT.format(e.date)}
                  </span>
                  {e.startTime && (
                    <span className="shrink-0 text-[11px] text-inkfaint">
                      {e.startTime}
                    </span>
                  )}
                  <span className="min-w-0 truncate">{e.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-xs font-bold text-inkfaint">
            やること
            {openTodoCount > 0 && (
              <span className="ml-2 text-xs font-normal text-inkfaint">
                {openTodoCount}件
              </span>
            )}
          </p>

          <TodoQuickAdd from="/" withDueDate={false} />

          <div className="mt-2">
            <TodoList
              todos={openTodos}
              from="/"
              emptyMessage="いまやることはありません。"
              showDelete={false}
            />
          </div>

          {openTodoCount > openTodos.length && (
            <Link
              href="/calendar"
              className="mt-1 block text-center text-xs font-bold text-matcha hover:text-matcha-deep"
            >
              ほか{openTodoCount - openTodos.length}件を見る
            </Link>
          )}
        </div>
      </section>

      {/* 育成の進み具合。押すとキャラクター画面へ。 */}
      <Link
        href="/character"
        className="mt-6 flex items-center gap-4 rounded-tile border border-matcha-line bg-matcha-soft px-5 py-4 transition hover:border-matcha hover:bg-white"
      >
        <Mascot size={56} accent={reward.accent} src={reward.image} />
        <span className="min-w-0 flex-1">
          <span className="block font-hand text-sm leading-relaxed text-matcha-deep">
            {info.isMax
              ? `${reward.name}はレベル${info.level}。もう全部そろったよ！`
              : `${reward.name}はレベル${info.level}。あと${info.neededXp - info.currentXp}XPで次のレベルだよ！`}
          </span>
          <span className="mt-2 block h-2 w-full overflow-hidden rounded-full bg-white">
            <span
              className="block h-full rounded-full bg-matcha"
              style={{ width: `${Math.max(info.progress, 3)}%` }}
            />
          </span>
        </span>
      </Link>
    </div>
  );
}
