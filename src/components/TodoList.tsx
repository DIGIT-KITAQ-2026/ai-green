import { toggleTodoAction, deleteTodoAction } from "@/app/actions/todos";
import { dateKey, todayKey } from "@/lib/calendar";

export type TodoItem = {
  id: string;
  title: string;
  dueDate: Date | null;
  done: boolean;
};

const DUE_FMT = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
});

/** 期限の見え方。過ぎていれば赤、今日なら強調。 */
function dueLabel(due: Date): { text: string; className: string } {
  const key = dateKey(due);
  const today = todayKey();
  if (key < today) return { text: `${DUE_FMT.format(due)} 期限切れ`, className: "text-red-600" };
  if (key === today) return { text: "今日まで", className: "text-red-600" };
  return { text: `${DUE_FMT.format(due)} まで`, className: "text-inkfaint" };
}

/**
 * ToDoの一覧。チェックと削除はそれぞれ小さなフォームで、
 * JavaScriptが無くても動くようにしている（ホーム・ToDo画面で共用）。
 */
export default function TodoList({
  todos,
  from,
  emptyMessage = "やることはまだありません。",
  showDelete = true,
}: {
  todos: TodoItem[];
  /** 操作後に戻るパス */
  from: string;
  emptyMessage?: string;
  showDelete?: boolean;
}) {
  if (todos.length === 0) {
    return <p className="py-6 text-center text-sm text-inkfaint">{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-line">
      {todos.map((t) => {
        const due = t.dueDate ? dueLabel(t.dueDate) : null;
        return (
          <li key={t.id} className="flex items-center gap-3 py-2.5">
            <form action={toggleTodoAction} className="flex shrink-0">
              <input type="hidden" name="todoId" value={t.id} />
              <input type="hidden" name="from" value={from} />
              <button
                type="submit"
                aria-label={t.done ? `${t.title} を未完了に戻す` : `${t.title} を完了にする`}
                className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition ${
                  t.done
                    ? "border-matcha bg-matcha text-white"
                    : "border-pencil bg-white hover:border-matcha"
                }`}
              >
                {t.done && (
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
                    <path
                      d="M4 10.5l4 4 8-8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </form>

            <div className="min-w-0 flex-1">
              <p
                className={`break-words text-sm ${
                  t.done ? "text-inkfaint line-through" : "text-ink"
                }`}
              >
                {t.title}
              </p>
              {due && !t.done && (
                <p className={`text-[11px] ${due.className}`}>{due.text}</p>
              )}
            </div>

            {showDelete && (
              <form action={deleteTodoAction} className="shrink-0">
                <input type="hidden" name="todoId" value={t.id} />
                <input type="hidden" name="from" value={from} />
                <button
                  type="submit"
                  aria-label={`${t.title} を削除する`}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-inkfaint transition hover:bg-red-50 hover:text-red-600"
                >
                  ×
                </button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}
