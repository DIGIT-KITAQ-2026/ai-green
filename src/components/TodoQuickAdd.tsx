import { createTodoAction } from "@/app/actions/todos";
import SubmitButton from "./SubmitButton";

/** ToDoの追加フォーム。期限は任意。 */
export default function TodoQuickAdd({
  from,
  withDueDate = true,
  defaultDueDate,
}: {
  from: string;
  withDueDate?: boolean;
  /** カレンダーの選択日から追加するときなど、期限をあらかじめ入れておく。 */
  defaultDueDate?: string;
}) {
  return (
    <form action={createTodoAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="from" value={from} />
      <input
        name="title"
        required
        placeholder="やることを追加…"
        aria-label="やること"
        className="field-input min-w-0 flex-1 basis-48 py-2 text-sm"
      />
      {withDueDate ? (
        <input
          type="date"
          name="dueDate"
          defaultValue={defaultDueDate}
          aria-label="期限（任意）"
          className="field-input w-auto shrink-0 py-2 text-sm"
        />
      ) : (
        defaultDueDate && <input type="hidden" name="dueDate" value={defaultDueDate} />
      )}
      <SubmitButton
        pendingLabel="追加中…"
        className="btn-secondary shrink-0 px-5 py-2 text-sm"
      >
        追加
      </SubmitButton>
    </form>
  );
}
